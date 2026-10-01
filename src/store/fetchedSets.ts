import { create } from "zustand";
import { setFile, type SetKey } from "@/data/fetchedSets";
import { addKanjiSet, addWordSet } from "@/data/library";
import { loadDictionaryFile, openDictionary } from "@/lib/jmdict/client";
import type { DictMeta, KanjiSetFile, SetFile } from "@/lib/jmdict/types";

export type SetStatus = "loading" | "ready" | "error";

interface FetchedSetsState {
  /** What the dictionary holds, once asked for; it has the size of each set before its items are fetched. */
  meta: DictMeta | null;
  /** Where each fetched set stands; one not asked for yet is absent. */
  status: Partial<Record<SetKey, SetStatus>>;
  /** Goes up each time a set joins the library, so screens that count items count again. */
  revision: number;

  loadMeta: () => void;
  /**
   * Fetches the given sets (a JLPT level's words, the kanji) and adds them to
   * the library, unless they are there or on their way. One that failed is
   * tried again. Resolves once each has settled, loaded or not.
   */
  ensure: (keys: Iterable<SetKey>) => Promise<void>;
}

const loading = new Map<SetKey, Promise<void>>();

export const useFetchedSets = create<FetchedSetsState>()((set, get) => ({
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

  ensure: async (keys) => {
    const waits: Promise<void>[] = [];
    for (const key of new Set(keys)) {
      if (get().status[key] === "ready") continue;
      let wait = loading.get(key);
      if (!wait) {
        set((s) => ({ status: { ...s.status, [key]: "loading" } }));
        wait = loadDictionaryFile(setFile(key))
          .then((file) => {
            if (key === "kanji") addKanjiSet(file as KanjiSetFile);
            else addWordSet(file as SetFile);
            set((s) => ({ status: { ...s.status, [key]: "ready" }, revision: s.revision + 1 }));
          })
          .catch(() => set((s) => ({ status: { ...s.status, [key]: "error" } })))
          .finally(() => loading.delete(key));
        loading.set(key, wait);
      }
      waits.push(wait);
    }
    await Promise.all(waits);
    get().loadMeta();
  },
}));

/** Changes whenever the library gains items; put it among a memo's dependencies to recount. */
export const useLibraryRevision = () => useFetchedSets((s) => s.revision);
