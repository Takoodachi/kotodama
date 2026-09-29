"use client";

import { MotionConfig } from "motion/react";
import { useEffect } from "react";
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

/** Mirrors the glyph-style setting onto <html> so CSS can switch Japanese fonts. */
function GlyphSync() {
  const glyph = useSettings((s) => s.glyph);
  useEffect(() => {
    document.documentElement.dataset.glyph = glyph;
  }, [glyph]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}>
      <StoreHydrator />
      <GlyphSync />
      <ServiceWorkerRegister />
      <AccountSync />
      {children}
    </MotionConfig>
  );
}
