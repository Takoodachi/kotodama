"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";

/**
 * Starts a quiz over the given items with the saved mode, directions and
 * length (unless overridden), then opens the quiz screen.
 */
export function useStartSession() {
  const router = useRouter();
  return useCallback(
    (itemIds: string[], overrides?: { length?: number }) => {
      const { mode, directions, sessionLength } = useSettings.getState();
      const started = useSession.getState().start({
        itemIds,
        mode,
        directions: directions[mode],
        length: overrides?.length ?? sessionLength,
      });
      if (started) router.push("/quiz");
      return started;
    },
    [router],
  );
}
