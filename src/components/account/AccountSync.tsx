"use client";

import { useEffect } from "react";
import { accountsEnabled, getSupabase } from "@/lib/sync/supabase";
import { isApplyingRemote, syncNow, useAccount } from "@/store/account";
import { useProgress } from "@/store/progress";

/** How long after an answer progress is saved: long enough to batch a run of answers. */
const SAVE_DELAY = 15_000;
/** Coming back to the app fetches other devices' practice, at most this often. */
const REFRESH_EVERY = 60_000;

const signedIn = () => useAccount.getState().status === "signed-in";

/**
 * Keeps the account session and progress sync running in the background:
 * restores the session on load, saves progress a little after it changes
 * and right away when the app is put away, and fetches what other devices
 * did when the app comes back into view or back online.
 */
export function AccountSync() {
  useEffect(() => {
    if (!accountsEnabled) return;
    let cancelled = false;
    let unsubscribeAuth = () => {};

    getSupabase()
      .then((client) => {
        if (cancelled) return;
        const { data } = client.auth.onAuthStateChange((event, session) => {
          const user = session?.user;
          if (event === "PASSWORD_RECOVERY") useAccount.setState({ recovering: true });
          if (!user) {
            useAccount.setState({ status: "signed-out", userId: null, email: null, sync: "idle" });
            return;
          }
          const newlySignedIn = useAccount.getState().userId !== user.id;
          useAccount.setState({ status: "signed-in", userId: user.id, email: user.email ?? null });
          // Supabase calls made inside this callback can deadlock, so sync once it has returned.
          if (newlySignedIn) setTimeout(() => void syncNow(), 0);
        });
        unsubscribeAuth = () => data.subscription.unsubscribe();
      })
      .catch(() => useAccount.setState({ status: "signed-out" }));

    let timer: ReturnType<typeof setTimeout> | undefined;
    const saveSoon = (delay: number) => {
      if (timer) {
        if (delay > 0) return;
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        timer = undefined;
        void syncNow();
      }, delay);
    };
    const flush = () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = undefined;
      void syncNow();
    };

    const unsubscribeProgress = useProgress.subscribe((state, prev) => {
      if (!signedIn() || isApplyingRemote()) return;
      if (state.resetAt !== prev.resetAt) saveSoon(0);
      else if (state.records !== prev.records || state.devices !== prev.devices) saveSoon(SAVE_DELAY);
    });
    const unsubscribeHydration = useProgress.persist.onFinishHydration(() => void syncNow());

    const onVisibility = () => {
      if (!signedIn()) return;
      if (document.visibilityState === "hidden") return flush();
      const { lastSynced } = useAccount.getState();
      if (!lastSynced || Date.now() - lastSynced > REFRESH_EVERY) void syncNow();
    };
    const onOnline = () => signedIn() && void syncNow();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      unsubscribeAuth();
      unsubscribeProgress();
      unsubscribeHydration();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
