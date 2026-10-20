"use client";

import { Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DictionaryBrowser } from "@/components/dictionary/DictionaryBrowser";
import { JmdictResults } from "@/components/dictionary/JmdictResults";
import { SearchField } from "@/components/dictionary/SearchField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { setKeys } from "@/data/fetchedSets";
import { ITEMS_BY_ID, itemsByIds } from "@/data/library";
import type { StudyItem } from "@/data/types";
import { wordSetItemId } from "@/data/wordSets";
import { useHydrated } from "@/hooks/useHydrated";
import { useUnlockProgress } from "@/hooks/useUnlockProgress";
import { dictionaryWordId, entryItem, isOwnId } from "@/lib/customQuiz";
import { unlockedEntries } from "@/lib/dictionary";
import type { JmEntry } from "@/lib/jmdict/types";
import { plural } from "@/lib/plural";
import { useCustomQuiz } from "@/store/customQuiz";
import { useFetchedSets, useLibraryRevision } from "@/store/fetchedSets";
import { useProgress } from "@/store/progress";
import { AddButton } from "./AddButton";
import { OwnEntryForm } from "./OwnEntryForm";
import { QuizSaveStatus } from "./QuizSaveStatus";

type Source = "jmdict" | "library";

/** A button that acts on the second press: the first one arms it for a few seconds. */
function useArmed(): [boolean, (act: () => void) => void] {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);
  const press = (act: () => void) => {
    if (!armed) return setArmed(true);
    act();
    setArmed(false);
  };
  return [armed, press];
}

/** Deletes an entry the learner wrote, on the second press. */
function DeleteOwn({ item }: { item: StudyItem }) {
  const deleteOwn = useCustomQuiz((s) => s.deleteOwn);
  const [armed, press] = useArmed();
  return (
    <button
      type="button"
      onClick={() => press(() => deleteOwn(item.id))}
      aria-label={armed ? `Press again to delete ${item.surface}` : `Delete ${item.surface} from your dictionary`}
      title={armed ? "Press again to delete it" : "Delete this entry of yours"}
      className={
        armed
          ? "flex h-8 shrink-0 items-center rounded-full border border-crimson/60 px-3 text-xs whitespace-nowrap text-crimson-bright"
          : "flex size-8 shrink-0 items-center justify-center rounded-full text-smoke transition-colors hover:bg-veil/5 hover:text-paper"
      }
    >
      {armed ? "Delete?" : <Trash2 className="size-3.5" strokeWidth={1.75} />}
    </button>
  );
}

/** Where a search with results still offers to write the entry by hand: a phrase or sentence of one's own, mostly. */
function OwnEntryOffer({ query, found }: { query: string; found: boolean }) {
  const [open, setOpen] = useState(false);
  // With nothing found the form is the way on; otherwise it waits to be asked for.
  if (!found || open) return <OwnEntryForm query={query} found={found} />;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="mt-3 w-full rounded-2xl border border-dashed border-veil/20 px-4 py-3 text-left text-xs leading-relaxed text-mist transition-colors hover:border-gold/50 hover:text-paper"
    >
      Not what you meant, or a phrase or sentence of your own?{" "}
      <span className="text-gold-bright">Add &ldquo;{query}&rdquo; yourself</span>
    </button>
  );
}

/**
 * The quiz the learner builds for themselves, an item at a time: what is in
 * it so far, and the dictionary to find more in, each entry with a button to
 * add it. What the dictionary lacks, they can write themselves.
 */
export function QuizBuilder() {
  const hydrated = useHydrated();
  const quiz = useCustomQuiz((s) => s.quiz);
  const add = useCustomQuiz((s) => s.add);
  const remove = useCustomQuiz((s) => s.remove);
  const clear = useCustomQuiz((s) => s.clear);
  const ensureSets = useFetchedSets((s) => s.ensure);
  const records = useProgress((s) => s.records);
  const revision = useLibraryRevision();
  const progress = useUnlockProgress();
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<Source>("jmdict");
  // The dictionary entry being added while its JLPT level's words are fetched.
  const [adding, setAdding] = useState<number | null>(null);
  const [clearing, pressClear] = useArmed();

  const setStatus = useFetchedSets((s) => s.status);

  const inQuiz = useMemo(() => new Set(quiz), [quiz]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the library itself grows when a set arrives or an entry is written
  const items = useMemo(() => itemsByIds(quiz), [quiz, revision]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const unlocked = useMemo(() => unlockedEntries(records), [records, revision]);
  // Words from a JLPT level are in the library once the level's words have been fetched.
  const absent = setKeys(quiz.filter((id) => !ITEMS_BY_ID.has(id)));
  const failed = absent.some((key) => setStatus[key] === "error");
  const waiting = absent.some((key) => setStatus[key] !== "error" && setStatus[key] !== "ready");

  /**
   * Adds a word from the full dictionary. One the library teaches, among its
   * own words or in a JLPT level's set, goes in as that item and so shares
   * its progress; any other is kept with the quiz as the dictionary gives it.
   */
  const addEntry = async (entry: JmEntry, ids: string[]) => {
    const known = ids.find((id) => ITEMS_BY_ID.has(id));
    if (known) return add(known);
    if (entry.j) {
      setAdding(entry.s);
      await ensureSets([`n${entry.j}`]);
      setAdding(null);
      const id = wordSetItemId(entry.j, entry.s);
      if (ITEMS_BY_ID.has(id)) return add(id);
    }
    add(dictionaryWordId(entry.s), entryItem(entry));
  };

  /** For an entry the library holds: adding it, and deleting it if the learner wrote it. */
  const itemAction = (item: StudyItem) => (
    <>
      <AddButton
        added={inQuiz.has(item.id)}
        name={item.surface}
        onClick={() => (inQuiz.has(item.id) ? remove([item.id]) : add(item.id))}
      />
      {isOwnId(item.id) && <DeleteOwn item={item} />}
    </>
  );

  return (
    <div className="space-y-4">
      <section className="glass rounded-2xl p-4 sm:p-6" aria-labelledby="own-quiz-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Your own quiz</p>
            <h2 id="own-quiz-title" className="mt-1.5 flex items-baseline gap-3">
              <span lang="ja" className="jp text-3xl text-paper">
                自作
              </span>
              <span className="text-xs text-mist tabular-nums">{hydrated ? plural(quiz.length, "item") : ""}</span>
            </h2>
          </div>
          {quiz.length > 0 && (
            <button
              type="button"
              onClick={() => pressClear(clear)}
              className={
                clearing
                  ? "h-8 shrink-0 rounded-full border border-crimson/60 px-3.5 text-xs text-crimson-bright"
                  : "h-8 shrink-0 rounded-full border border-line px-3.5 text-xs text-mist transition-colors hover:border-veil/25 hover:text-paper"
              }
            >
              {clearing ? "Press again to empty it" : "Empty the quiz"}
            </button>
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-mist">
          Look a word up below and press <span className="text-paper">Add</span>. A word the dictionary doesn&apos;t have,
          or a phrase or sentence of your own, you can write in yourself.
        </p>
        {items.length > 0 && (
          <ul className="mt-4 flex max-h-44 flex-wrap gap-1.5 overflow-y-auto" aria-label="In your quiz">
            {items.map((item) => (
              <li
                key={item.id}
                title={item.meaning.join("; ")}
                className="flex h-8 items-center rounded-full border border-line bg-veil/[0.03] pr-1 pl-3 text-sm text-paper"
              >
                <span lang="ja" className="jp max-w-44 truncate">
                  {item.surface}
                </span>
                <button
                  type="button"
                  onClick={() => remove([item.id])}
                  aria-label={`Remove ${item.surface} from your quiz`}
                  className="ml-0.5 flex size-6 items-center justify-center rounded-full text-smoke transition-colors hover:bg-veil/10 hover:text-paper"
                >
                  <X className="size-3.5" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {(waiting || failed) && (
          <p className="mt-3 text-xs text-smoke" role="status">
            {plural(quiz.length - items.length, "more word")} from the dictionary{" "}
            {waiting ? "on the way…" : "couldn't be fetched: they need a connection the first time."}
          </p>
        )}
        {hydrated && (
          <div className="mt-4 border-t border-line pt-3">
            <QuizSaveStatus />
          </div>
        )}
      </section>

      <section aria-label="Dictionary">
        <SearchField value={query} onChange={setQuery} />
        <SegmentedControl
          label="Search in"
          value={source}
          onChange={setSource}
          className="mt-2.5"
          options={[
            { value: "jmdict", label: "Full dictionary" },
            {
              value: "library",
              label: (
                <>
                  My library
                  {hydrated && <span className="ml-1.5 text-gold-bright tabular-nums">{progress.unlocked.toLocaleString("en")}</span>}
                </>
              ),
              title: "My library",
            },
          ]}
        />
        {source === "jmdict" ? (
          <JmdictResults
            query={query}
            onQuery={setQuery}
            onUseLibrary={() => setSource("library")}
            action={(entry, ids) => {
              const added = ids.filter((id) => inQuiz.has(id));
              return (
                <AddButton
                  added={added.length > 0}
                  busy={adding === entry.s}
                  name={entry.k?.[0] ?? entry.r[0]}
                  onClick={() => (added.length ? remove(added) : void addEntry(entry, ids))}
                />
              );
            }}
            ownAction={itemAction}
            // A new search starts the form afresh.
            missing={(typed, found) => <OwnEntryOffer key={typed} query={typed} found={found} />}
          />
        ) : (
          <div className="mt-3">
            <DictionaryBrowser unlocked={unlocked} scope="all" query={query} action={itemAction} />
          </div>
        )}
      </section>
    </div>
  );
}
