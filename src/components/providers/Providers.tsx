"use client";

import { MotionConfig } from "motion/react";
import { useEffect } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { AccountSync } from "@/components/account/AccountSync";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { useProgress } from "@/store/progress";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";

/** Reads saved state from localStorage once the app has mounted. */
function StoreHydrator() {
  useEffect(() => {
    void useSettings.persist.rehydrate();
    void useProgress.persist.rehydrate();
    void useSession.persist.rehydrate();
  }, []);
  return null;
}

/**
 * Mirrors the glyph style and theme onto <html> so CSS can follow them. Waits
 * for saved settings, so the defaults never overwrite what the inline script
 * in the layout already applied.
 */
function PreferenceSync() {
  const hydrated = useHydrated();
  const glyph = useSettings((s) => s.glyph);
  const theme = useSettings((s) => s.theme);

  useEffect(() => {
    if (hydrated) document.documentElement.dataset.glyph = glyph;
  }, [glyph, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const resolved = theme === "system" ? (media.matches ? "light" : "dark") : theme;
      document.documentElement.dataset.theme = resolved;
      // The browser and phone status bar tint.
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "light" ? "#f3eee5" : "#0a0a0a");
    };
    apply();
    if (theme !== "system") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, hydrated]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}>
      <StoreHydrator />
      <PreferenceSync />
      <ServiceWorkerRegister />
      <AccountSync />
      {children}
    </MotionConfig>
  );
}
