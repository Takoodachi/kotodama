"use client";

import { useEffect } from "react";
import { withBasePath } from "@/lib/basePath";

/**
 * Registers the offline service worker in production builds. It is skipped
 * in development so cached pages never hide code changes.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(withBasePath("/sw.js"), { scope: withBasePath("/"), updateViaCache: "none" })
      .catch((error) => {
        console.warn("Service worker registration failed", error);
      });
  }, []);
  return null;
}
