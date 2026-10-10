"use client";

import { MotionConfig } from "motion/react";
import { useEffect, useMemo } from "react";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useHydrated } from "@/hooks/useHydrated";
import { AccountSync } from "@/components/account/AccountSync";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { setKeys, type SetKey } from "@/data/fetchedSets";
import { useCustomQuiz } from "@/store/customQuiz";
import { useProgress } from "@/store/progress";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";
import { requestPersistentStorage } from "@/store/storage";
import { useFetchedSets } from "@/store/fetchedSets";

/** Reads saved state from localStorage once the app has mounted. */
function StoreHydrator() {
  useEffect(() => {
    void useSettings.persist.rehydrate();
    void useProgress.persist.rehydrate();
    // Before the session: a quiz under way may be over the learner's own items.
    void useCustomQuiz.persist.rehydrate();
    void useSession.persist.rehydrate();
  }, []);
  return null;
}

/**
 * Mirrors the glyph style, Japanese text size and theme onto <html> so CSS
 * can follow them. Waits for saved settings, so the defaults never overwrite
 * what the inline script in the layout already applied.
 */
function PreferenceSync() {
  const hydrated = useHydrated();
  const glyph = useSettings((s) => s.glyph);
  const jpSize = useSettings((s) => s.jpSize);
  const theme = useSettings((s) => s.theme);

  useEffect(() => {
    if (hydrated) document.documentElement.dataset.glyph = glyph;
  }, [glyph, hydrated]);

  useEffect(() => {
    if (hydrated) document.documentElement.style.setProperty("--jp-scale", String(jpSize));
  }, [jpSize, hydrated]);

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

/**
 * Fetches the sets in use that aren't bundled with the app (JLPT words, the
 * full kanji sets): the ones selected for practice, and the ones with items
 * already practiced, in the quiz under way or in the learner's own quiz, so
 * their progress shows everywhere. Tried again when the connection returns.
 */
function FetchedSetLoader() {
  const hydrated = useHydrated();
  const selected = useSettings((s) => s.selected);
  const records = useProgress((s) => s.records);
  const poolIds = useSession((s) => s.poolIds);
  const ownQuiz = useCustomQuiz((s) => s.quiz);
  const ensure = useFetchedSets((s) => s.ensure);
  // As one string, so the effect below only runs again when the sets needed change.
  const keys = useMemo(
    () => setKeys([...selected, ...poolIds, ...ownQuiz, ...Object.keys(records)]).join(" "),
    [selected, poolIds, ownQuiz, records],
  );

  useEffect(() => {
    if (!hydrated || !keys) return;
    const load = () => void ensure(keys.split(" ") as SetKey[]);
    load();
    window.addEventListener("online", load);
    return () => window.removeEventListener("online", load);
  }, [hydrated, keys, ensure]);

  return null;
}

/** M turns every pronunciation off and back on, on any page; like every shortcut, not while typing in a field. */
function MuteHotkey() {
  const toggle = () => {
    const { muted, setMuted } = useSettings.getState();
    setMuted(!muted);
  };
  // Both cases, for Shift and Caps Lock.
  useHotkeys({ m: toggle, M: toggle });
  return null;
}

/** Once there is progress to lose, asks the browser not to clear this site's storage by itself. */
function StorageKeeper() {
  const hydrated = useHydrated();
  const hasProgress = useProgress((s) => s.totals.answered > 0);
  useEffect(() => {
    if (hydrated && hasProgress) void requestPersistentStorage();
  }, [hydrated, hasProgress]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}>
      <StoreHydrator />
      <PreferenceSync />
      <FetchedSetLoader />
      <StorageKeeper />
      <MuteHotkey />
      <ServiceWorkerRegister />
      <AccountSync />
      {children}
    </MotionConfig>
  );
}
