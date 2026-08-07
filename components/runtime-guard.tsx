"use client";

import { useEffect, useState, type ReactNode } from "react";
import { basePath } from "@/lib/paths";
import type { CompatUser, FirebaseServices } from "@/lib/firebase";

type GuardState = "checking" | "allowed" | "unavailable";

function activeBlock(data: Record<string, unknown> | undefined): boolean {
  if (data?.blocked !== true) return false;
  const expiresAt = data.expiresAt;
  if (expiresAt && typeof expiresAt === "object" && "toMillis" in expiresAt) {
    const toMillis = (expiresAt as { toMillis?: unknown }).toMillis;
    if (typeof toMillis === "function" && toMillis.call(expiresAt) <= Date.now()) return false;
  }
  return true;
}

export function RuntimeGuard({
  services,
  user,
  children,
}: {
  services: FirebaseServices;
  user: CompatUser;
  children: ReactNode;
}) {
  const [state, setState] = useState<GuardState>("checking");

  useEffect(() => {
    setState("checking");
    const runtimeRef = services.db.collection("userRuntime").doc(user.uid);
    return runtimeRef.onSnapshot(
      (snapshot) => {
        if (activeBlock(snapshot.data())) {
          window.location.replace(`${basePath}/under-review/`);
          return;
        }
        setState("allowed");
      },
      () => setState("unavailable"),
    );
  }, [services, user.uid]);

  if (state === "checking") {
    return <div className="admin-gate" aria-live="polite"><span className="brand-mark">S</span><p>Checking workspace access…</p></div>;
  }

  if (state === "unavailable") {
    return <div className="admin-gate"><span className="brand-mark large">S</span><span className="eyebrow">Access check unavailable</span><h1>We could not verify this workspace.</h1><p>No private content has been loaded. Check your connection and try again.</p><button className="button" onClick={() => window.location.reload()}>Try again</button></div>;
  }

  return children;
}
