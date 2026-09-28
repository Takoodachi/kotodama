"use client";

import { useSyncExternalStore } from "react";
import { useProgress } from "@/store/progress";
import { useSettings } from "@/store/settings";

function subscribe(onChange: () => void) {
  const unsubSettings = useSettings.persist.onFinishHydration(onChange);
  const unsubProgress = useProgress.persist.onFinishHydration(onChange);
  return () => {
    unsubSettings();
    unsubProgress();
  };
}

const isHydrated = () => useSettings.persist.hasHydrated() && useProgress.persist.hasHydrated();

/**
 * True once saved settings and progress have been read from localStorage.
 * Always false during server rendering and the first client render, so the
 * HTML matches, and UI that depends on saved state can show a placeholder.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, isHydrated, () => false);
}
