import { create } from "zustand";
import { addWordSet } from "@/data/library";
import type { JlptLevel } from "@/data/types";
import { loadDictionaryFile, openDictionary } from "@/lib/jmdict/client";
import type { DictMeta, SetFile } from "@/lib/jmdict/types";

export type WordSetStatus = "loading" | "ready" | "error";

interface WordSetsState {
  /** What the dictionary holds, once asked for; it has the size of each set before its words are fetched. */
  meta: DictMeta | null;
  /** Where each level's words stand; a level not asked for yet is absent. */
  status: Partial<Record<JlptLevel, WordSetStatus>>;
  /** Goes up each time a level's words join the library, so screens that count items count again. */
  revision: number;

  loadMeta: () => void;
  /**
   * Fetches the words of the given levels and adds them to the library,
   * unless they are there or on their way. A level that failed is tried
   * again. Resolves once every level has settled, loaded or not.
   */
  ensure: (levels: Iterable<JlptLevel>) => Promise<void>;
}

const loading = new Map<JlptLevel, Promise<void>>();

export const useWordSets = create<WordSetsState>()((set, get) => ({
  meta: null,
  status: {},
  revision: 0,

  loadMeta: () => {
    if (get().meta) return;
    openDictionary().then(
      (dictionary) => set({ meta: dictionary.meta }),
      () => {},
    );
  },

  ensure: async (levels) => {
    const waits: Promise<void>[] = [];
    for (const level of new Set(levels)) {
      if (get().status[level] === "ready") continue;
      let wait = loading.get(level);
      if (!wait) {
        set((s) => ({ status: { ...s.status, [level]: "loading" } }));
        wait = loadDictionaryFile(`sets/n${level}.json`)
          .then((file) => {
            addWordSet(file as SetFile);
            set((s) => ({ status: { ...s.status, [level]: "ready" }, revision: s.revision + 1 }));
          })
          .catch(() => set((s) => ({ status: { ...s.status, [level]: "error" } })))
          .finally(() => loading.delete(level));
        loading.set(level, wait);
      }
      waits.push(wait);
    }
    await Promise.all(waits);
    get().loadMeta();
  },
}));

/** Changes whenever the library gains words; put it among a memo's dependencies to recount. */
export const useLibraryRevision = () => useWordSets((s) => s.revision);
