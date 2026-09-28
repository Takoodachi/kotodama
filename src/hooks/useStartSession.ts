"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ITEMS_BY_ID } from "@/data/library";
import { weakestItems } from "@/lib/analytics";
import { useProgress } from "@/store/progress";
import { useSession, type SessionLabel } from "@/store/session";
import { useSettings } from "@/store/settings";

/** How many items Ghost mode pulls in. */
export const GHOST_SIZE = 20;

/**
 * Starts a quiz over the given items with the saved mode, directions and
 * length (unless overridden), then opens the quiz screen.
 */
export function useStartSession() {
  const router = useRouter();
  return useCallback(
    (itemIds: string[], overrides?: { length?: number; label?: SessionLabel }) => {
      const { mode, directions, sessionLength, writing } = useSettings.getState();
      const started = useSession.getState().start({
        itemIds,
        mode,
        directions: directions[mode],
        length: overrides?.length ?? sessionLength,
        label: overrides?.label,
        writing,
      });
      if (started) router.push("/quiz");
      return started;
    },
    [router],
  );
}

/** Ghost mode: one pass over the items with the lowest accuracy so far. */
export function useStartGhostMode() {
  const startSession = useStartSession();
  return useCallback(() => {
    const ids = weakestItems(useProgress.getState().records, GHOST_SIZE, (id) => ITEMS_BY_ID.has(id));
    return startSession(ids, { length: ids.length, label: "ghost" });
  }, [startSession]);
}
