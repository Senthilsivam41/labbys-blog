import { createHash, randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { defineSecret, defineString } from "firebase-functions/params";

initializeApp();
const db = getFirestore();
const githubToken = defineSecret("GITHUB_DISPATCH_TOKEN");
const inquirySalt = defineSecret("INQUIRY_HASH_SALT");
const adminEmail = defineString("ADMIN_EMAIL");
const githubOwner = defineString("GITHUB_OWNER");
const githubRepo = defineString("GITHUB_REPO", { default: "blog-site" });
const contentCollections = ["articles", "talks", "slides", "projects"] as const;
const runtimeReasonCodes = new Set(["publishing_review", "suspected_abuse", "account_recovery", "manual_owner_action"]);

function requireOwner(auth: { token: Record<string, unknown> } | undefined) {
  const email = typeof auth?.token.email === "string" ? auth.token.email.toLowerCase() : "";
  if (!email || email !== adminEmail.value().toLowerCase()) throw new HttpsError("permission-denied", "Owner access required.");
}

function requiredString(value: unknown, name: string, max: number, min = 1) {
  if (typeof value !== "string") throw new HttpsError("invalid-argument", `${name} is required.`);
  const clean = value.trim();
  if (clean.length < min || clean.length > max) throw new HttpsError("invalid-argument", `${name} is invalid.`);
  return clean;
}

function rejectRuntimeRequest(
  code: "unauthenticated" | "permission-denied" | "invalid-argument" | "failed-precondition",
  reason: string,
  request: { auth?: unknown; app?: unknown },
): never {
  logger.warn("Admin runtime request rejected.", {
    securityEvent: true,
    functionName: "updateUserRuntime",
    reason,
    authenticated: Boolean(request.auth),
    appVerified: Boolean(request.app),
  });
  throw new HttpsError(code, code === "invalid-argument" ? "The runtime update is invalid." : "The runtime update was rejected.");
}

function parseStorageUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const match = url.match(/\/o\/([^?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function promoteAsset(url: unknown, uid: string, collection: string, id: string): Promise<string | undefined> {
  const sourcePath = parseStorageUrl(url);
  if (!sourcePath || !sourcePath.startsWith(`drafts/${uid}/`)) return typeof url === "string" ? url : undefined;
  const filename = sourcePath.split("/").pop();
  if (!filename) return undefined;
  const destinationPath = `public/${collection}/${id}/${filename}`;
  const bucket = getStorage().bucket();
  const token = randomUUID();
  await bucket.file(sourcePath).copy(bucket.file(destinationPath));
  await bucket.file(destinationPath).setMetadata({ metadata: { firebaseStorageDownloadTokens: token }, cacheControl: "public,max-age=31536000,immutable" });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destinationPath)}?alt=media&token=${token}`;
}

async function dispatchBuild(reason: Record<string, string>) {
  const response = await fetch(`https://api.github.com/repos/${githubOwner.value()}/${githubRepo.value()}/dispatches`, { method: "POST", headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${githubToken.value()}`, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "labs-built-by-sendil" }, body: JSON.stringify({ event_type: "content-published", client_payload: reason }) });
  if (!response.ok) throw new HttpsError("internal", "The content is saved, but the GitHub build could not be requested.");
}

export const submitInquiry = onCall({ enforceAppCheck: true, secrets: [inquirySalt] }, async (request) => {
  const name = requiredString(request.data?.name, "Name", 100);
  const email = requiredString(request.data?.email, "Email", 200);
  const message = requiredString(request.data?.message, "Message", 3000, 20);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpsError("invalid-argument", "Email is invalid.");
  const address = request.rawRequest.ip ?? "unknown";
  const key = createHash("sha256").update(`${inquirySalt.value()}:${address}`).digest("hex");
  const limitRef = db.doc(`inquiryRateLimits/${key}`);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(limitRef);
    const last = snapshot.data()?.lastCreatedAt;
    if (last instanceof Timestamp && Date.now() - last.toMillis() < 60_000) throw new HttpsError("resource-exhausted", "Please wait before sending another inquiry.");
    transaction.set(limitRef, { lastCreatedAt: FieldValue.serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000) });
    transaction.create(db.collection("inquiries").doc(), { name, email: email.toLowerCase(), message, status: "new", createdAt: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});

export const publishContent = onCall({ enforceAppCheck: true, secrets: [githubToken] }, async (request) => {
  requireOwner(request.auth);
  const collection = requiredString(request.data?.collection, "Collection", 30);
  const id = requiredString(request.data?.id, "ID", 100);
  const action = request.data?.action === "unpublish" ? "unpublish" : "publish";
  if (!contentCollections.includes(collection as (typeof contentCollections)[number])) throw new HttpsError("invalid-argument", "Unsupported content collection.");
  const ref = db.collection(collection).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Content record not found.");
  const data = snapshot.data() ?? {};
  const update: Record<string, unknown> = { status: action === "publish" ? "published" : "draft", updatedAt: FieldValue.serverTimestamp() };
  if (action === "publish") {
    update.publishedAt = data.publishedAt ?? FieldValue.serverTimestamp();
    for (const field of ["coverUrl", "pdfUrl"]) {
      const promoted = await promoteAsset(data[field], request.auth!.uid, collection, id);
      if (promoted && promoted !== data[field]) { update[`draft${field[0].toUpperCase()}${field.slice(1)}`] = data[field]; update[field] = promoted; }
    }
  } else {
    for (const field of ["coverUrl", "pdfUrl"]) {
      const draftField = `draft${field[0].toUpperCase()}${field.slice(1)}`;
      if (data[draftField]) update[field] = data[draftField];
    }
  }
  await ref.update(update);
  await dispatchBuild({ collection, id, action });
  return { ok: true, action };
});

export const requestSiteBuild = onCall({ enforceAppCheck: true, secrets: [githubToken] }, async (request) => {
  requireOwner(request.auth);
  const reason = typeof request.data?.reason === "string" ? request.data.reason.slice(0, 80) : "site-settings";
  await dispatchBuild({ collection: "site", id: "primary", action: reason });
  return { ok: true };
});

export const updateUserRuntime = onCall(
  { enforceAppCheck: true, consumeAppCheckToken: true },
  async (request) => {
    if (!request.auth) rejectRuntimeRequest("unauthenticated", "missing_auth", request);
    if (request.auth.token.admin !== true) rejectRuntimeRequest("permission-denied", "missing_admin_claim", request);
    if (request.app?.alreadyConsumed) rejectRuntimeRequest("failed-precondition", "replayed_app_check_token", request);

    const userId = typeof request.data?.userId === "string" ? request.data.userId.trim() : "";
    const blocked = request.data?.blocked;
    const reasonCode = typeof request.data?.reasonCode === "string" ? request.data.reasonCode : "manual_owner_action";
    const expiresInMinutes = request.data?.expiresInMinutes ?? 60;

    if (!userId || userId.length > 128) rejectRuntimeRequest("invalid-argument", "invalid_user_id", request);
    if (typeof blocked !== "boolean") rejectRuntimeRequest("invalid-argument", "invalid_blocked_value", request);
    if (!runtimeReasonCodes.has(reasonCode)) rejectRuntimeRequest("invalid-argument", "invalid_reason_code", request);
    if (!Number.isInteger(expiresInMinutes) || expiresInMinutes < 1 || expiresInMinutes > 10_080) {
      rejectRuntimeRequest("invalid-argument", "invalid_expiry", request);
    }

    try {
      await getAuth().getUser(userId);
    } catch (error) {
      if ((error as { code?: string }).code === "auth/user-not-found") {
        rejectRuntimeRequest("invalid-argument", "unknown_target_user", request);
      }
      logger.error("Admin runtime user lookup failed.", {
        functionName: "updateUserRuntime",
        failureType: "user_lookup_failed",
      });
      throw new HttpsError("internal", "The runtime state could not be updated.");
    }

    const runtimeRef = db.doc(`userRuntime/${userId}`);
    const expiresAt = Timestamp.fromMillis(blocked ? Date.now() + expiresInMinutes * 60_000 : Date.now());
    try {
      await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(runtimeRef);
        const version = Number(snapshot.data()?.version ?? 0) + 1;
        transaction.set(runtimeRef, {
          blocked,
          reasonCode,
          expiresAt,
          version,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: request.auth!.uid,
        });
      });
    } catch {
      logger.error("Admin runtime state write failed.", {
        functionName: "updateUserRuntime",
        failureType: "firestore_write_failed",
      });
      throw new HttpsError("internal", "The runtime state could not be updated.");
    }

    logger.info("Admin runtime state updated.", {
      auditEvent: true,
      functionName: "updateUserRuntime",
      blocked,
      reasonCode,
    });
    return { ok: true, blocked, expiresAt: expiresAt.toDate().toISOString() };
  },
);

function serializable(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializable);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, serializable(child)]));
  return value;
}

export const publishedContentManifest = onRequest({ cors: true }, async (_request, response) => {
  try {
    const [siteDoc, serviceDocs, ...contentDocs] = await Promise.all([
      db.doc("siteSettings/primary").get(),
      db.collection("services").where("active", "==", true).orderBy("order").get(),
      ...contentCollections.map((name) => db.collection(name).where("status", "==", "published").get()),
    ]);
    const defaults = { displayName: "Labs Built by Sendil", shortName: "LabbyS", role: "Multi-faceted Solution Architect", motto: "What we can achieve with what we have", biography: "A working lab for useful ideas—where technology, business, and people come together.", socialLinks: [] };
    const defaultServices = [
      { id: "strategy", title: "Technical strategy", description: "Turn business intent into a practical technology direction, roadmap, and set of decisions.", order: 1, active: true },
      { id: "architecture", title: "Solution architecture", description: "Review, shape, or simplify systems so they can grow with clarity and resilience.", order: 2, active: true },
      { id: "ai", title: "AI & automation", description: "Find grounded ways to apply AI and automation to real workflows, teams, and products.", order: 3, active: true },
      { id: "startup", title: "Startup guidance", description: "Support founders with MVP choices, technical trade-offs, and the path from idea to execution.", order: 4, active: true },
      { id: "career", title: "Career mentoring", description: "Help students, freshers, and technical professionals build judgment, confidence, and momentum.", order: 5, active: true },
    ];
    const serviceRecords = serviceDocs.empty ? defaultServices : serviceDocs.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const payload = { site: { ...defaults, ...(siteDoc.data() ?? {}) }, services: serviceRecords, ...Object.fromEntries(contentCollections.map((name, index) => [name, contentDocs[index].docs.map((doc) => ({ id: doc.id, ...doc.data() }))])), generatedAt: new Date().toISOString() };
    response.set("Cache-Control", "public, max-age=60, s-maxage=300");
    response.json(serializable(payload));
  } catch (error) { console.error(error); response.status(503).json({ error: "Published content is temporarily unavailable." }); }
});
