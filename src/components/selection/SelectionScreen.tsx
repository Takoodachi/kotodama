"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { QuizBuilder } from "@/components/custom/QuizBuilder";
import { DictionaryLink } from "@/components/dictionary/DictionaryLink";
import { BELOW_HEADER } from "@/components/layout/nav";
import { GhostModeButton } from "@/components/practice/GhostModeButton";
import { ScrollJump, useArrowJump, useScrollEnds } from "@/components/practice/ScrollJump";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SECTIONS, groupIdsOfSection } from "@/data/groups";
import { countForGroups, itemsByIds, itemsForGroups, WRITTEN_CATEGORIES } from "@/data/library";
import type { Category } from "@/data/types";
import { setKeys, setLabel } from "@/data/fetchedSets";
import { useActiveSection } from "@/hooks/useActiveSection";
import { useHydrated } from "@/hooks/useHydrated";
import { useStartSession } from "@/hooks/useStartSession";
import { useTouchDevice } from "@/hooks/useTouchDevice";
import { CATEGORY_LABELS } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { availableModes, GRID_CATEGORIES, shownMode, type PracticeMode } from "@/lib/quiz/directions";
import { useCustomQuiz } from "@/store/customQuiz";
import { useProgress } from "@/store/progress";
import { useSettings, type SessionLength } from "@/store/settings";
import { useLibraryRevision, useFetchedSets } from "@/store/fetchedSets";
import { AnswerWithPicker } from "./AnswerWithPicker";
import { DirectionPicker } from "./DirectionPicker";
import { ModePicker } from "./ModePicker";
import { PresetBar } from "./PresetBar";
import { SectionPanel } from "./SectionPanel";
import { StartBar } from "./StartBar";
import { WritingPicker } from "./WritingPicker";

const LENGTHS: { value: SessionLength; label: string }[] = [
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: 30, label: "30" },
  { value: 50, label: "50" },
  { value: 0, label: "∞" },
];

/** A quiz of one's own is typed: card by card, or every card on one page. */
const OWN_MODES: PracticeMode[] = ["reading", "grid"];

const SECTION_IDS = SECTIONS.map((section) => `section-${section.id}`);
const NO_SECTIONS: string[] = [];

const TAB = "flex h-8 items-center gap-2 rounded-full border px-3.5 text-xs whitespace-nowrap transition-colors";
const TAB_ON = "border-veil/25 bg-veil/[0.08] text-paper";
const TAB_OFF = "border-line text-mist hover:border-veil/20 hover:text-paper";

function Label({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2.5 text-[11px] tracking-[0.2em] text-smoke uppercase">{children}</h3>;
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-crimson px-1.5 text-[10px] text-on-accent tabular-nums shadow-[0_0_10px_rgb(200_16_46/0.6)]">
      {children}
    </span>
  );
}

/** "words, phrases & grammar" */
function listKinds(categories: Category[]): string {
  const names = categories.map((c) => CATEGORY_LABELS[c].en.toLowerCase());
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} & ${names.at(-1)}`;
}

export function SelectionScreen() {
  const hydrated = useHydrated();
  const settings = useSettings();
  const records = useProgress((s) => s.records);
  const startSession = useStartSession();
  const router = useRouter();
  const touch = useTouchDevice();

  // The quiz the learner builds themselves takes the place of the sets while it is open.
  const building = useCustomQuiz((s) => s.building);
  const setBuilding = useCustomQuiz((s) => s.setBuilding);
  const ownQuiz = useCustomQuiz((s) => s.quiz);
  const ownMode = useCustomQuiz((s) => s.mode);
  const setOwnMode = useCustomQuiz((s) => s.setMode);
  const mode = building ? ownMode : shownMode(settings.mode, touch);

  // Sets drawn from the dictionary (JLPT words, the full kanji sets) arrive
  // after the page: their sizes are known first (from its summary), their
  // items once a set is selected.
  const revision = useLibraryRevision();
  const setSizes = useFetchedSets((s) => s.meta?.sets);
  const setNewWords = useFetchedSets((s) => s.meta?.setNewWords);
  const setStatus = useFetchedSets((s) => s.status);
  const loadMeta = useFetchedSets((s) => s.loadMeta);
  const ensureSets = useFetchedSets((s) => s.ensure);
  useEffect(loadMeta, [loadMeta]);
  const neededSets = useMemo(
    () => setKeys(building ? ownQuiz : settings.selected),
    [building, ownQuiz, settings.selected],
  );
  const setsLoading = neededSets.some((key) => setStatus[key] === "loading");
  const setsFailed = neededSets.filter((key) => setStatus[key] === "error");

  const selected = useMemo(() => new Set(settings.selected), [settings.selected]);
  const items = useMemo(
    () => (building ? itemsByIds(ownQuiz) : itemsForGroups(settings.selected)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the library itself grows when a fetched set arrives
    [building, ownQuiz, settings.selected, revision],
  );
  const categories = useMemo(
    // An empty quiz of one's own will hold words: how to answer them can be chosen before the first is added.
    () => new Set<Category>(building && !items.length ? ["vocab"] : items.map((i) => i.category)),
    [building, items],
  );
  // Items on their way count too, so the total doesn't jump when they land; they are all grid cards.
  const pendingCount = useMemo(
    () =>
      building
        ? setsLoading
          ? ownQuiz.length - items.length
          : 0
        : countForGroups(settings.selected, setSizes) - countForGroups(settings.selected),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [building, ownQuiz, items, setsLoading, settings.selected, setSizes, revision],
  );
  // Of the sets, the grid only shows short items with a reading: kana, kanji
  // and words. A quiz of one's own is shown whole, as it was put together.
  const inGrid = (category: Category) => building || GRID_CATEGORIES.has(category);
  const gridCount = items.filter((i) => inGrid(i.category)).length + pendingCount;
  // "Written in" only matters when something written with words is selected.
  const writtenKinds = [...WRITTEN_CATEGORIES].filter((c) => categories.has(c) && (mode !== "grid" || inGrid(c)));

  const sectionCounts = useMemo(
    () =>
      Object.fromEntries(
        SECTIONS.map((section) => {
          const ids = groupIdsOfSection(section).filter((id) => selected.has(id));
          return [section.id, countForGroups(ids, setSizes)];
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, setSizes, revision],
  );

  const start = async () => {
    if (mode === "grid") return router.push(building ? "/all/own" : "/all");
    // Selected sets may still be on their way.
    await ensureSets(neededSets);
    if (building) startSession(itemsByIds(ownQuiz).map((i) => i.id), { mode: "reading" });
    else startSession(itemsForGroups(settings.selected).map((i) => i.id));
  };
  // While the quiz builder is open there are no sections on the page to follow.
  const activeSection = useActiveSection(building ? NO_SECTIONS : SECTION_IDS);

  // A section's tab pressed while the quiz builder is open: the sets come back first, then the page goes to it.
  const goTo = useRef<string | null>(null);
  useEffect(() => {
    if (building || !goTo.current) return;
    document.getElementById(goTo.current)?.scrollIntoView();
    goTo.current = null;
  }, [building]);

  // The page is long: buttons, and ↑ or ↓ pressed twice, go to either end of it.
  const scrollEnds = useScrollEnds();
  useArrowJump();

  // On a phone the tabs scroll sideways and the quiz builder's is the last: it is brought into view while open.
  const tabs = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (building && hydrated) tabs.current?.scrollTo({ left: tabs.current.scrollWidth });
  }, [building, hydrated]);

  const sessionSetup = (
    <div className="glass space-y-6 rounded-2xl p-4 sm:p-6">
      <div>
        <Label>Mode</Label>
        {building ? (
          <ModePicker modes={OWN_MODES} value={mode} onChange={(next) => setOwnMode(next === "grid" ? "grid" : "reading")} />
        ) : (
          <ModePicker modes={availableModes(touch)} value={mode} onChange={settings.setMode} />
        )}
      </div>
      {mode === "grid" ? (
        <div>
          <Label>How it works</Label>
          <ul className="space-y-1.5 text-xs leading-relaxed text-mist">
            <li>{building ? "Everything in your quiz" : "Every selected card"} is laid out on one page, shuffled.</li>
            <li>
              Type what you know and press Enter or Tab:{" "}
              {building ? (
                <>
                  any <span className="text-paper">reading or the meaning</span>.
                </>
              ) : (
                <>
                  <span className="text-paper">romaji</span> for kana, any{" "}
                  <span className="text-paper">reading or the meaning</span> for kanji and words.
                </>
              )}
            </li>
            <li>Wrong ones stay red, and after the last card you loop back round to them.</li>
            <li>Finish whenever you like to see what you missed.</li>
            {gridCount < items.length && (
              <li className="text-smoke">Phrases, sentences and grammar are left out: they&apos;re too long for a grid.</li>
            )}
          </ul>
        </div>
      ) : mode === "reading" ? (
        <div>
          <Label>Answer with</Label>
          <AnswerWithPicker
            value={settings.directions.reading[0]}
            onChange={settings.setReadingAnswer}
            categories={categories}
          />
        </div>
      ) : (
        <div>
          <Label>Directions</Label>
          <DirectionPicker
            mode={mode}
            enabled={settings.directions[mode]}
            onToggle={(d) => settings.toggleDirection(mode, d)}
            categories={categories}
          />
        </div>
      )}
      {writtenKinds.length > 0 && (
        <div>
          <Label>Written in · {listKinds(writtenKinds)}</Label>
          <WritingPicker value={settings.writing} furigana={settings.furigana} onToggle={settings.toggleWriting} />
        </div>
      )}
      {mode !== "grid" && (
        <div>
          <Label>Session length</Label>
          <SegmentedControl
            label="Session length"
            value={settings.sessionLength}
            onChange={settings.setSessionLength}
            options={LENGTHS}
          />
        </div>
      )}
      {(setsLoading || setsFailed.length > 0) && (
        <p className="text-xs leading-relaxed text-mist" role="status">
          {setsFailed.length > 0 ? (
            <>
              <span className="text-crimson-bright">Couldn&apos;t fetch the {setsFailed.map(setLabel).join(", ")}.</span>{" "}
              Sets from the dictionary need a connection the first time; after that they work offline.
            </>
          ) : (
            "Fetching from the dictionary…"
          )}
        </p>
      )}
    </div>
  );

  const startBar = {
    itemCount: mode === "grid" ? gridCount : items.length + pendingCount,
    mode,
    sessionLength: settings.sessionLength,
    onStart: start,
    emptyHint: building ? "Add something to your quiz" : undefined,
  };

  return (
    <motion.div
      initial={false}
      animate={{ opacity: hydrated ? 1 : 0 }}
      transition={{ duration: 0.4 }}
      className="w-full pb-40 lg:pb-16"
    >
      <div className="mx-auto max-w-6xl px-4 pt-4 md:px-8 md:pt-8">
        <header className="mb-5 flex flex-col gap-4 md:mb-6 md:flex-row md:items-end md:justify-between md:gap-8">
          <div>
            <p className="eyebrow"><span lang="ja">練習</span> · Practice</p>
            <h1 className="mt-2 font-mincho text-3xl leading-tight text-paper md:text-5xl">Choose what to practice</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
              {building
                ? "Put a quiz together yourself, a word, a phrase or a sentence at a time."
                : "Mix any sets you like: a katakana row, a kanji level and a handful of phrases can all go in one session."}
            </p>
          </div>
          <DictionaryLink className="md:w-80 md:shrink-0" />
        </header>
        {/* The presets pick sets, which the quiz builder doesn't use. */}
        {!building && (
          <PresetBar selected={selected} onToggle={settings.setGroups} onClear={() => settings.setSelection([])} />
        )}
      </div>

      {/* Full-width frosted bar that docks flush under the header. */}
      <nav
        aria-label="Sections"
        className={cn("sticky z-20 mt-3 mb-6 border-y border-line bg-ink-950/75 backdrop-blur-xl", BELOW_HEADER)}
      >
        {/* Leaves the end of the bar to the top-and-bottom buttons, where the screen is wide enough to have them there. */}
        <ul
          ref={tabs}
          className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] md:px-8 lg:pr-30"
        >
          {SECTIONS.map((section) => {
            const id = `section-${section.id}`;
            // The section last scrolled to is no longer on the page once the quiz builder is.
            const current = !building && activeSection === id;
            return (
              <li key={section.id}>
                <a
                  href={`#${id}`}
                  aria-current={current ? "location" : undefined}
                  onClick={(event) => {
                    if (!building) return;
                    event.preventDefault();
                    goTo.current = id;
                    setBuilding(false);
                  }}
                  className={cn(TAB, current ? TAB_ON : TAB_OFF)}
                >
                  {section.title}
                  {sectionCounts[section.id] > 0 && <Count>{sectionCounts[section.id]}</Count>}
                </a>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-pressed={building}
              onClick={() => {
                setBuilding(!building);
                window.scrollTo({ top: 0 });
              }}
              className={cn(TAB, building ? "border-gold/60 bg-gold/[0.1] text-gold-bright" : "border-gold/30 text-gold-bright hover:border-gold/60")}
            >
              <Plus className="-ml-1 size-3.5" strokeWidth={2} />
              Create your own quiz
              {ownQuiz.length > 0 && <Count>{ownQuiz.length}</Count>}
            </button>
          </li>
        </ul>
        <ScrollJump
          ends={scrollEnds}
          row
          className="absolute top-1/2 right-[max(2rem,calc(50%-34rem))] hidden -translate-y-1/2 lg:flex"
        />
      </nav>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 md:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <aside className="space-y-4 lg:sticky lg:top-40 lg:order-last lg:self-start">
          {sessionSetup}
          <div className="hidden lg:block">
            <StartBar docked {...startBar} />
          </div>
          {!building && <GhostModeButton className="w-full" compact />}
        </aside>

        {building ? (
          <QuizBuilder />
        ) : (
          <div className="space-y-6">
            {SECTIONS.map((section) => (
              <SectionPanel
                key={section.id}
                section={section}
                selected={selected}
                records={records}
                setSizes={setSizes}
                setNewWords={setNewWords}
                kanjiGrouping={settings.kanjiGrouping}
                onKanjiGrouping={settings.setKanjiGrouping}
                onToggle={settings.toggleGroup}
                onSetGroups={settings.setGroups}
              />
            ))}
          </div>
        )}
      </div>

      <StartBar {...startBar} />
      {/* On narrower screens the tabs fill their bar, so the buttons float above the start bar instead. */}
      <ScrollJump
        ends={scrollEnds}
        className="fixed right-3 bottom-[calc(10.25rem+env(safe-area-inset-bottom))] z-30 flex md:bottom-[calc(6.5rem+env(safe-area-inset-bottom))] lg:hidden"
      />
    </motion.div>
  );
}
