"use client";

import { useEffect, useMemo } from "react";
import { unlockProgress } from "@/lib/dictionary";
import { useProgress } from "@/store/progress";
import { useLibraryRevision, useFetchedSets } from "@/store/fetchedSets";

/** How many dictionary entries the learner has unlocked, out of how many there are to unlock. */
export function useUnlockProgress(): { unlocked: number; total: number } {
  const records = useProgress((s) => s.records);
  const revision = useLibraryRevision();
  const newWords = useFetchedSets((s) => s.meta?.newWords);
  const loadMeta = useFetchedSets((s) => s.loadMeta);
  useEffect(loadMeta, [loadMeta]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the library itself grows when a word set arrives
  return useMemo(() => unlockProgress(records, newWords), [records, newWords, revision]);
}
