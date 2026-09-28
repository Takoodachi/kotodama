"use client";

import { useEffect } from "react";
import { withBasePath } from "@/lib/basePath";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
const WARMED_KEY = "kotodama-fonts-warmed";

/**
 * Downloads, through the service worker, the Japanese font slices covering
 * every character in the library, so text renders in the app's fonts
 * offline. Fonts are split into hundreds of small unicode-range files; this
 * fetches only the ones the content needs, not all 16 MB.
 */
async function warmJapaneseFonts() {
  try {
    if (localStorage.getItem(WARMED_KEY) === BUILD_ID) return;
  } catch {
    return;
  }
  const { LIBRARY } = await import("@/data/library");
  const chars = new Set<string>();
  for (const item of LIBRARY) {
    for (const ch of item.surface + item.reading + (item.example ? item.example.jp : "")) chars.add(ch);
  }
  const text = [...chars].filter((ch) => ch.charCodeAt(0) > 0x2fff).join("");
  const root = getComputedStyle(document.documentElement);
  const families = ["--font-noto-jp", "--font-shippori"].map((v) => root.getPropertyValue(v).trim()).filter(Boolean);
  await Promise.all(families.map((family) => document.fonts.load(`400 16px ${family}`, text)));
  try {
    localStorage.setItem(WARMED_KEY, BUILD_ID);
  } catch {
    // Storage unavailable: the fonts are cached anyway, they'll just be checked again next time.
  }
}

/**
 * Registers the offline service worker in production builds. It is skipped
 * in development so cached pages never hide code changes.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(withBasePath(`/sw.js?v=${BUILD_ID}`), { scope: withBasePath("/"), updateViaCache: "none" })
      .catch((error) => console.warn("Service worker registration failed", error));

    const warm = () => {
      if (!navigator.onLine || !navigator.serviceWorker.controller) return;
      const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 2000));
      idle(() => void warmJapaneseFonts().catch(() => {}));
    };
    // On a first visit the worker takes control a moment after loading.
    if (navigator.serviceWorker.controller) warm();
    else navigator.serviceWorker.addEventListener("controllerchange", warm, { once: true });
  }, []);
  return null;
}
