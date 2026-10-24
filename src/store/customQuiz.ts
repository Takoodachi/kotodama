import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { setCustomItems } from "@/data/library";
import { isOwnId, type CustomItem } from "@/lib/customQuiz";
import { toSurface } from "@/lib/furigana";
import { emptyOwn, itemsOf, mergeOwn, quizOf, readOwn, savedOf, stamp, type OwnDoc, type SavedQuiz } from "@/lib/sync/ownDoc";
import { useFetchedSets } from "./fetchedSets";

/** The two ways a quiz of one's own is run: typed card by card, or every card on one page. */
export type CustomMode = "reading" | "grid";

interface CustomQuizState {
  /** Whether the Practice page shows the quiz being built, in place of the sets to pick. */
  building: boolean;
  mode: CustomMode;
  /**
   * The quiz and the items kept with it, each change with its time: the form
   * that is saved to the account and merged between devices (see lib/sync/ownDoc).
   */
  doc: OwnDoc;
  /** From `doc`: ids of the items in the quiz, in the order they were added. */
  quiz: string[];
  /**
   * From `doc`: the items the library doesn't carry itself, which are entries
   * the learner wrote and dictionary words that are in none of the sets. They
   * stay when taken out of the quiz, so their progress keeps something to belong to.
   */
  items: CustomItem[];
  /** From `doc`: the quizzes put by under a name, in the order of their names. */
  saved: (SavedQuiz & { id: string })[];

  setBuilding: (building: boolean) => void;
  setMode: (mode: CustomMode) => void;
  /** Puts an item in the quiz; `item` comes with it when the library has no such item. */
  add: (id: string, item?: CustomItem) => void;
  remove: (ids: readonly string[]) => void;
  clear: () => void;
  /**
   * Keeps an entry the learner wrote and puts it in the quiz. One written the
   * same way already is replaced, keeping its id and so its progress. Returns the id.
   */
  saveOwn: (item: CustomItem) => string;
  /** Deletes an entry the learner wrote, from the quiz as well. */
  deleteOwn: (id: string) => void;
  /** Puts the quiz by under a name; one saved under the same name is replaced. */
  saveQuiz: (name: string) => void;
  /** Makes a quiz put by the one being built, in place of what is there. */
  loadQuiz: (id: string) => void;
  deleteSaved: (id: string) => void;
  /** Merges in the quiz from the account, or takes it as it is when this device's belongs to another account. */
  mergeDoc: (doc: OwnDoc, replace?: boolean) => void;
  /** Forgets the quiz on this device, e.g. when signing out. */
  clearLocal: () => void;
}

/** An id for a new entry of the learner's own. */
export const newOwnId = () => `own-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

const newSavedId = () => `quiz-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

const withDoc = (doc: OwnDoc) => ({ doc, quiz: quizOf(doc), items: itemsOf(doc), saved: savedOf(doc) });

/** The doc with some ids put in the quiz or taken out of it, now. */
function withQuiz(doc: OwnDoc, ids: readonly string[], inQuiz: boolean): OwnDoc {
  const quiz = { ...doc.quiz };
  for (const id of ids) quiz[id] = { at: stamp(quiz[id]), in: inQuiz };
  return { ...doc, quiz };
}

/** The doc with a quiz put by, or deleted (null), now. */
function withSaved(doc: OwnDoc, id: string, quiz: SavedQuiz | null): OwnDoc {
  return { ...doc, saved: { ...doc.saved, [id]: { at: stamp(doc.saved[id]), quiz } } };
}

/** The doc with an item written, or deleted (null), now. */
function withItem(doc: OwnDoc, id: string, item: CustomItem | null): OwnDoc {
  return { ...doc, items: { ...doc.items, [id]: { at: stamp(doc.items[id]), item } } };
}

export const useCustomQuiz = create<CustomQuizState>()(
  persist(
    (set, get) => ({
      building: false,
      mode: "reading",
      ...withDoc(emptyOwn()),

      setBuilding: (building) => set({ building }),
      setMode: (mode) => set({ mode }),
      add: (id, item) =>
        set((s) => {
          // Already in: it keeps its place.
          const doc = s.doc.quiz[id]?.in ? s.doc : withQuiz(s.doc, [id], true);
          return withDoc(item ? withItem(doc, id, item) : doc);
        }),
      remove: (ids) =>
        set((s) => {
          const there = ids.filter((id) => s.doc.quiz[id]?.in);
          return there.length ? withDoc(withQuiz(s.doc, there, false)) : s;
        }),
      clear: () => set((s) => withDoc(withQuiz(s.doc, s.quiz, false))),
      saveOwn: (item) => {
        const written = toSurface(item.jp);
        const same = get().items.find((other) => isOwnId(other.id) && toSurface(other.jp) === written);
        const saved = { ...item, id: same?.id ?? item.id };
        get().add(saved.id, saved);
        return saved.id;
      },
      deleteOwn: (id) =>
        set((s) => {
          const doc = withItem(s.doc, id, null);
          return withDoc(doc.quiz[id]?.in ? withQuiz(doc, [id], false) : doc);
        }),
      saveQuiz: (name) =>
        set((s) => {
          const id = s.saved.find((other) => other.name === name)?.id ?? newSavedId();
          return withDoc(withSaved(s.doc, id, { name, ids: s.quiz }));
        }),
      loadQuiz: (id) =>
        set((s) => {
          // An entry deleted since the quiz was saved is left out.
          const ids = s.doc.saved[id]?.quiz?.ids.filter((item) => s.doc.items[item]?.item !== null);
          if (!ids) return s;
          const out = s.quiz.filter((item) => !ids.includes(item));
          // Put in again in the saved order, so the quiz runs as it did.
          return withDoc(withQuiz(withQuiz(s.doc, out, false), ids, true));
        }),
      deleteSaved: (id) => set((s) => withDoc(withSaved(s.doc, id, null))),
      mergeDoc: (doc, replace = false) =>
        set((s) => {
          const merged = replace ? doc : mergeOwn(s.doc, doc);
          // Nothing new from the account: the lists stay the ones they were, and nothing is drawn again.
          return JSON.stringify(merged) === JSON.stringify(s.doc) ? s : withDoc(merged);
        }),
      clearLocal: () => set(withDoc(emptyOwn())),
    }),
    {
      name: "kotodama-custom",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ building, mode, doc }) => ({ building, mode, doc }),
      // The lists are worked out from the doc again, which is read with care: it may come from an older version.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Pick<CustomQuizState, "building" | "mode" | "doc">>;
        return {
          ...current,
          building: saved.building === true,
          mode: saved.mode === "grid" ? "grid" : "reading",
          ...withDoc(readOwn(saved.doc)),
        };
      },
      // Rehydrated by <StoreHydrator /> after mount so server and client render the same HTML.
      skipHydration: true,
    },
  ),
);

// The library holds these items for as long as the quiz does, so quizzes, the
// dictionary and the progress pages treat them like any other.
useCustomQuiz.subscribe((state, before) => {
  if (state.items === before.items) return;
  if (setCustomItems(state.items)) useFetchedSets.setState((s) => ({ revision: s.revision + 1 }));
});
