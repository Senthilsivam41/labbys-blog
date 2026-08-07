"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishedContentManifest = exports.updateUserRuntime = exports.requestSiteBuild = exports.publishContent = exports.submitInquiry = void 0;
const node_crypto_1 = require("node:crypto");
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const params_1 = require("firebase-functions/params");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const githubToken = (0, params_1.defineSecret)("GITHUB_DISPATCH_TOKEN");
const inquirySalt = (0, params_1.defineSecret)("INQUIRY_HASH_SALT");
const adminEmail = (0, params_1.defineString)("ADMIN_EMAIL");
const githubOwner = (0, params_1.defineString)("GITHUB_OWNER");
const githubRepo = (0, params_1.defineString)("GITHUB_REPO", { default: "blog-site" });
const contentCollections = ["articles", "talks", "slides", "projects"];
const runtimeReasonCodes = new Set(["publishing_review", "suspected_abuse", "account_recovery", "manual_owner_action"]);
function requireOwner(auth) {
    const email = typeof auth?.token.email === "string" ? auth.token.email.toLowerCase() : "";
    if (!email || email !== adminEmail.value().toLowerCase())
        throw new https_1.HttpsError("permission-denied", "Owner access required.");
}
function requiredString(value, name, max, min = 1) {
    if (typeof value !== "string")
        throw new https_1.HttpsError("invalid-argument", `${name} is required.`);
    const clean = value.trim();
    if (clean.length < min || clean.length > max)
        throw new https_1.HttpsError("invalid-argument", `${name} is invalid.`);
    return clean;
}
function rejectRuntimeRequest(code, reason, request) {
    firebase_functions_1.logger.warn("Admin runtime request rejected.", {
        securityEvent: true,
        functionName: "updateUserRuntime",
        reason,
        authenticated: Boolean(request.auth),
        appVerified: Boolean(request.app),
    });
    throw new https_1.HttpsError(code, code === "invalid-argument" ? "The runtime update is invalid." : "The runtime update was rejected.");
}
function parseStorageUrl(url) {
    if (typeof url !== "string")
        return null;
    const match = url.match(/\/o\/([^?]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}
async function promoteAsset(url, uid, collection, id) {
    const sourcePath = parseStorageUrl(url);
    if (!sourcePath || !sourcePath.startsWith(`drafts/${uid}/`))
        return typeof url === "string" ? url : undefined;
    const filename = sourcePath.split("/").pop();
    if (!filename)
        return undefined;
    const destinationPath = `public/${collection}/${id}/${filename}`;
    const bucket = (0, storage_1.getStorage)().bucket();
    const token = (0, node_crypto_1.randomUUID)();
    await bucket.file(sourcePath).copy(bucket.file(destinationPath));
    await bucket.file(destinationPath).setMetadata({ metadata: { firebaseStorageDownloadTokens: token }, cacheControl: "public,max-age=31536000,immutable" });
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destinationPath)}?alt=media&token=${token}`;
}
async function dispatchBuild(reason) {
    const response = await fetch(`https://api.github.com/repos/${githubOwner.value()}/${githubRepo.value()}/dispatches`, { method: "POST", headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${githubToken.value()}`, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "labs-built-by-sendil" }, body: JSON.stringify({ event_type: "content-published", client_payload: reason }) });
    if (!response.ok)
        throw new https_1.HttpsError("internal", "The content is saved, but the GitHub build could not be requested.");
}
exports.submitInquiry = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [inquirySalt] }, async (request) => {
    const name = requiredString(request.data?.name, "Name", 100);
    const email = requiredString(request.data?.email, "Email", 200);
    const message = requiredString(request.data?.message, "Message", 3000, 20);
    if (!/^\S+@\S+\.\S+$/.test(email))
        throw new https_1.HttpsError("invalid-argument", "Email is invalid.");
    const address = request.rawRequest.ip ?? "unknown";
    const key = (0, node_crypto_1.createHash)("sha256").update(`${inquirySalt.value()}:${address}`).digest("hex");
    const limitRef = db.doc(`inquiryRateLimits/${key}`);
    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(limitRef);
        const last = snapshot.data()?.lastCreatedAt;
        if (last instanceof firestore_1.Timestamp && Date.now() - last.toMillis() < 60_000)
            throw new https_1.HttpsError("resource-exhausted", "Please wait before sending another inquiry.");
        transaction.set(limitRef, { lastCreatedAt: firestore_1.FieldValue.serverTimestamp(), expiresAt: firestore_1.Timestamp.fromMillis(Date.now() + 86_400_000) });
        transaction.create(db.collection("inquiries").doc(), { name, email: email.toLowerCase(), message, status: "new", createdAt: firestore_1.FieldValue.serverTimestamp() });
    });
    return { ok: true };
});
exports.publishContent = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [githubToken] }, async (request) => {
    requireOwner(request.auth);
    const collection = requiredString(request.data?.collection, "Collection", 30);
    const id = requiredString(request.data?.id, "ID", 100);
    const action = request.data?.action === "unpublish" ? "unpublish" : "publish";
    if (!contentCollections.includes(collection))
        throw new https_1.HttpsError("invalid-argument", "Unsupported content collection.");
    const ref = db.collection(collection).doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists)
        throw new https_1.HttpsError("not-found", "Content record not found.");
    const data = snapshot.data() ?? {};
    const update = { status: action === "publish" ? "published" : "draft", updatedAt: firestore_1.FieldValue.serverTimestamp() };
    if (action === "publish") {
        update.publishedAt = data.publishedAt ?? firestore_1.FieldValue.serverTimestamp();
        for (const field of ["coverUrl", "pdfUrl"]) {
            const promoted = await promoteAsset(data[field], request.auth.uid, collection, id);
            if (promoted && promoted !== data[field]) {
                update[`draft${field[0].toUpperCase()}${field.slice(1)}`] = data[field];
                update[field] = promoted;
            }
        }
    }
    else {
        for (const field of ["coverUrl", "pdfUrl"]) {
            const draftField = `draft${field[0].toUpperCase()}${field.slice(1)}`;
            if (data[draftField])
                update[field] = data[draftField];
        }
    }
    await ref.update(update);
    await dispatchBuild({ collection, id, action });
    return { ok: true, action };
});
exports.requestSiteBuild = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [githubToken] }, async (request) => {
    requireOwner(request.auth);
    const reason = typeof request.data?.reason === "string" ? request.data.reason.slice(0, 80) : "site-settings";
    await dispatchBuild({ collection: "site", id: "primary", action: reason });
    return { ok: true };
});
exports.updateUserRuntime = (0, https_1.onCall)({ enforceAppCheck: true, consumeAppCheckToken: true }, async (request) => {
    if (!request.auth)
        rejectRuntimeRequest("unauthenticated", "missing_auth", request);
    if (request.auth.token.admin !== true)
        rejectRuntimeRequest("permission-denied", "missing_admin_claim", request);
    if (request.app?.alreadyConsumed)
        rejectRuntimeRequest("failed-precondition", "replayed_app_check_token", request);
    const userId = typeof request.data?.userId === "string" ? request.data.userId.trim() : "";
    const blocked = request.data?.blocked;
    const reasonCode = typeof request.data?.reasonCode === "string" ? request.data.reasonCode : "manual_owner_action";
    const expiresInMinutes = request.data?.expiresInMinutes ?? 60;
    if (!userId || userId.length > 128)
        rejectRuntimeRequest("invalid-argument", "invalid_user_id", request);
    if (typeof blocked !== "boolean")
        rejectRuntimeRequest("invalid-argument", "invalid_blocked_value", request);
    if (!runtimeReasonCodes.has(reasonCode))
        rejectRuntimeRequest("invalid-argument", "invalid_reason_code", request);
    if (!Number.isInteger(expiresInMinutes) || expiresInMinutes < 1 || expiresInMinutes > 10_080) {
        rejectRuntimeRequest("invalid-argument", "invalid_expiry", request);
    }
    try {
        await (0, auth_1.getAuth)().getUser(userId);
    }
    catch (error) {
        if (error.code === "auth/user-not-found") {
            rejectRuntimeRequest("invalid-argument", "unknown_target_user", request);
        }
        firebase_functions_1.logger.error("Admin runtime user lookup failed.", {
            functionName: "updateUserRuntime",
            failureType: "user_lookup_failed",
        });
        throw new https_1.HttpsError("internal", "The runtime state could not be updated.");
    }
    const runtimeRef = db.doc(`userRuntime/${userId}`);
    const expiresAt = firestore_1.Timestamp.fromMillis(blocked ? Date.now() + expiresInMinutes * 60_000 : Date.now());
    try {
        await db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(runtimeRef);
            const version = Number(snapshot.data()?.version ?? 0) + 1;
            transaction.set(runtimeRef, {
                blocked,
                reasonCode,
                expiresAt,
                version,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                updatedBy: request.auth.uid,
            });
        });
    }
    catch {
        firebase_functions_1.logger.error("Admin runtime state write failed.", {
            functionName: "updateUserRuntime",
            failureType: "firestore_write_failed",
        });
        throw new https_1.HttpsError("internal", "The runtime state could not be updated.");
    }
    firebase_functions_1.logger.info("Admin runtime state updated.", {
        auditEvent: true,
        functionName: "updateUserRuntime",
        blocked,
        reasonCode,
    });
    return { ok: true, blocked, expiresAt: expiresAt.toDate().toISOString() };
});
function serializable(value) {
    if (value instanceof firestore_1.Timestamp)
        return value.toDate().toISOString();
    if (Array.isArray(value))
        return value.map(serializable);
    if (value && typeof value === "object")
        return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, serializable(child)]));
    return value;
}
exports.publishedContentManifest = (0, https_1.onRequest)({ cors: true }, async (_request, response) => {
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
    }
    catch (error) {
        console.error(error);
        response.status(503).json({ error: "Published content is temporarily unavailable." });
    }
});
