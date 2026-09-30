"use client";

import { ArrowRight, RotateCcw, Target, X } from "lucide-react";
import { motion, useAnimate } from "motion/react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { MuteButton } from "@/components/ui/MuteButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { itemsForGroups, speechText, writtenItem } from "@/data/library";
import type { StudyItem } from "@/data/types";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useHydrated } from "@/hooks/useHydrated";
import { useSpeech } from "@/hooks/useSpeech";
import { useStartSession } from "@/hooks/useStartSession";
import { cn } from "@/lib/cn";
import { GRID_CATEGORIES } from "@/lib/quiz/directions";
import { toSurface } from "@/lib/furigana";
import { cardColumns, checkGridAnswer, gridAnswer, gridHint, packRows } from "@/lib/quiz/grid";
import { seededRng, shuffle } from "@/lib/random";
import { scriptNames } from "@/lib/writing";
import { useProgress } from "@/store/progress";
import { useSettings } from "@/store/settings";

interface CardState {
  status: "open" | "right";
  tries: number;
  /** Whether the first try was right; null until tried. */
  firstTry: boolean | null;
  /** The last answer checked. */
  given?: string;
}

const UNTRIED: CardState = { status: "open", tries: 0, firstTry: null };

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

const SPANS = { 1: undefined, 2: "col-span-2", 3: "col-span-3" } as const;

/**
 * How wide a card is and how big its text, so words never wrap. The grid is
 * three columns on a phone (about 100px each) and more on wider screens;
 * see `cardColumns`. Three characters fit one column only at a smaller size.
 */
function cardSize(text: string): { span?: string; glyph: string; wide: boolean } {
  const columns = cardColumns(text);
  if (columns > 1) return { span: SPANS[columns], glyph: "text-3xl", wide: true };
  return { glyph: [...text].length <= 2 ? "text-4xl" : "text-2xl", wide: false };
}

/** Where Enter and Tab go from a card: forward, or back with Shift+Tab. */
type Move = "next" | "previous";

interface CardProps {
  item: StudyItem;
  shown: StudyItem;
  state: CardState;
  finished: boolean;
  /**
   * Checks the typed answer: on Enter or Tab, which then move to another
   * card, or when leaving the field some other way. Returns whether it was
   * right, or null if there was nothing new to check.
   */
  onCheck: (input: HTMLInputElement, how: Move | "leave") => boolean | null;
  inputRef: (el: HTMLInputElement | null) => void;
  onPlay: () => void;
}

function GridCard({ item, shown, state, finished, onCheck, inputRef, onPlay }: CardProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const shake = () => void animate(scope.current, { x: [0, -7, 7, -4, 4, 0] }, { duration: 0.4 });
  const right = state.status === "right";
  const revealed = right || finished;
  const missed = finished && !right;
  const answer = gridAnswer(shown);
  const size = cardSize(shown.surface);

  return (
    <div
      ref={scope}
      className={cn(
        // The field sits at the bottom, so cards in a row line up whatever their height.
        "relative flex flex-col items-center justify-between gap-2 rounded-2xl border px-1.5 pt-3 pb-2 text-center transition-colors duration-300 sm:px-2.5 sm:pb-2.5",
        size.span,
        // The glass surface sets its own border and fill, so answered cards swap it out.
        right ? "border-gold/60 bg-gold/[0.1]" : missed ? "border-crimson/45 bg-crimson/[0.07]" : "glass",
      )}
    >
      {right && state.tries > 1 && (
        <span className="absolute top-1.5 right-2 text-[10px] text-mist tabular-nums" title={`Right on try ${state.tries}`}>
          ×{state.tries}
        </span>
      )}
      <button
        type="button"
        onClick={onPlay}
        disabled={!revealed}
        tabIndex={revealed ? 0 : -1}
        aria-label={revealed ? `Play ${shown.surface}` : undefined}
        className={cn("jp leading-tight whitespace-nowrap text-paper", size.glyph, revealed && "cursor-pointer")}
        lang="ja"
      >
        {shown.surface}
      </button>
      {revealed ? (
        <div className="min-h-9 text-xs leading-snug">
          <p className={cn(right ? "text-gold-bright" : "text-crimson-bright", /[ぁ-ヿ]/.test(answer.reading) && "jp")}>
            {answer.reading}
          </p>
          {answer.meaning && <p className="text-[11px] text-mist">{answer.meaning}</p>}
          {shown.usual && (
            <p className="mt-0.5 text-[10px] text-smoke" title={`Usually written in ${scriptNames(toSurface(shown.usual))}`}>
              usually{" "}
              <span lang="ja" className="jp text-[11px] text-mist">
                {toSurface(shown.usual)}
              </span>
            </p>
          )}
          {missed && state.given && (
            <p className="mt-0.5 text-[10px] text-smoke">
              you: <span className="line-through">{state.given}</span>
            </p>
          )}
        </div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          aria-label={`Answer for ${shown.surface}`}
          placeholder={gridHint(item, size.wide)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="next"
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== "Tab") return;
            // The Enter that confirms a Japanese keyboard's conversion isn't a submit.
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
            event.preventDefault();
            const move = event.key === "Tab" && event.shiftKey ? "previous" : "next";
            if (onCheck(event.currentTarget, move) === false) shake();
          }}
          // Tapping or clicking another card checks the answer too.
          onBlur={(event) => {
            if (onCheck(event.currentTarget, "leave") === false) shake();
          }}
          className={cn(
            // Scroll margins keep a focused card clear of the header and the bottom bar.
            "h-9 w-full min-w-0 scroll-mt-20 scroll-mb-28 rounded-lg border bg-veil/[0.04] px-1 text-center text-sm text-paper outline-none transition-colors placeholder:text-[10px] placeholder:text-smoke focus:border-gold/60",
            state.tries > 0 ? "border-crimson/60" : "border-line",
          )}
        />
      )}
    </div>
  );
}

/**
 * Tofugu-style "type what you know": every selected kana, kanji and word on
 * one page. Type an answer and press Enter; right cards turn gold, wrong ones
 * shake and can be tried again. Finish shows the rest.
 */
export function GridPractice() {
  const hydrated = useHydrated();
  const selected = useSettings((s) => s.selected);
  const writing = useSettings((s) => s.writing);
  const autoplay = useSettings((s) => s.audio.autoplay);
  const record = useProgress((s) => s.record);
  const startSession = useStartSession();
  const { speak } = useSpeech();

  const [seed, setSeed] = useState(newSeed);
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const [finished, setFinished] = useState(false);
  const inputs = useRef(new Map<string, HTMLInputElement>());
  // What was last checked on each card, so leaving a field doesn't check the same text twice.
  const checked = useRef(new Map<string, string>());
  // Cards tried at least once: like a quiz, only the first try counts toward spaced repetition.
  const tried = useRef(new Set<string>());

  const items = useMemo(
    () => shuffle(itemsForGroups(selected).filter((i) => GRID_CATEGORIES.has(i.category)), seededRng(seed)),
    [selected, seed],
  );

  // The grid's column count, measured, so the cards can be put in row order (see packRows).
  const grid = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(3);
  const columnsNow = useRef(3);
  // The field being typed in when the column count changes: moving cards around can drop its focus.
  const refocus = useRef<HTMLInputElement | null>(null);
  const hasGrid = hydrated && items.length > 0;
  useLayoutEffect(() => {
    const el = grid.current;
    if (!el) return;
    const measure = () => {
      const count = getComputedStyle(el).gridTemplateColumns.split(" ").length;
      if (count === columnsNow.current) return;
      columnsNow.current = count;
      refocus.current = document.activeElement instanceof HTMLInputElement ? document.activeElement : null;
      setColumns(count);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasGrid]);

  const ordered = useMemo(
    () => packRows(items, (item) => cardColumns(writtenItem(item, writing).surface), columns),
    [items, writing, columns],
  );

  useLayoutEffect(() => {
    const input = refocus.current;
    refocus.current = null;
    if (input?.isConnected && document.activeElement !== input) input.focus();
  }, [ordered]);

  const stateOf = (id: string) => cards[id] ?? UNTRIED;
  const rightCount = items.filter((i) => stateOf(i.id).status === "right").length;
  const firstTryCount = items.filter((i) => stateOf(i.id).firstTry === true).length;
  const retriedCount = rightCount - firstTryCount;
  const untriedCount = items.filter((i) => stateOf(i.id).tries === 0).length;
  const perfect = items.length > 0 && rightCount === items.length;

  /**
   * Moves to the next card still waiting for an answer, in reading order, or
   * the previous one. Past the last card it loops back to the first one still
   * open, so wrong and skipped cards come round again. False if none is left.
   */
  const focusOpen = (fromId: string, move: Move): boolean => {
    const count = ordered.length;
    const start = ordered.findIndex((i) => i.id === fromId);
    const step = move === "next" ? 1 : -1;
    for (let k = 1; k < count; k++) {
      const card = ordered[(((start + step * k) % count) + count) % count];
      const input = inputs.current.get(card.id);
      if (!input || stateOf(card.id).status === "right") continue;
      input.focus();
      // A wrong answer is still in the field: selected, so typing replaces it.
      input.select();
      return true;
    }
    return false;
  };

  /** Grades an answer, records a first try, and returns the card's new state. */
  const grade = (item: StudyItem, value: string, prev: CardState): CardState => {
    const correct = checkGridAnswer(item, value);
    if (!tried.current.has(item.id)) {
      tried.current.add(item.id);
      record(item.id, correct, true);
    }
    checked.current.set(item.id, value);
    return {
      status: correct ? "right" : "open",
      tries: prev.tries + 1,
      firstTry: prev.firstTry ?? correct,
      given: value,
    };
  };

  const check = (item: StudyItem, input: HTMLInputElement, how: Move | "leave"): boolean | null => {
    // Cards being rearranged for a new column count: not the learner leaving the field.
    if (how === "leave" && refocus.current) return null;
    const value = input.value.trim();
    let correct: boolean | null = null;
    // Nothing new to check (empty, or the same wrong answer again): Enter and Tab just move on.
    if (value && checked.current.get(item.id) !== value) {
      const next = grade(item, value, stateOf(item.id));
      setCards((all) => ({ ...all, [item.id]: next }));
      correct = next.status === "right";
      if (correct && autoplay !== "off") speak(speechText(item));
      // The last card right: that's everything, so show the result.
      if (correct && items.every((i) => i.id === item.id || stateOf(i.id).status === "right")) {
        finish();
        return correct;
      }
    }
    // Right or wrong, Enter and Tab move on, and wrong cards come round again after the
    // last one. With no other card open, stay here to try again.
    if (how !== "leave" && !focusOpen(item.id, how)) input.select();
    return correct;
  };

  const finish = () => {
    // Answers typed but never checked (no Enter, no leaving the field) still count.
    const late: Record<string, CardState> = {};
    for (const item of items) {
      const value = inputs.current.get(item.id)?.value.trim();
      if (!value || checked.current.get(item.id) === value || stateOf(item.id).status === "right") continue;
      late[item.id] = grade(item, value, stateOf(item.id));
    }
    setCards((all) => ({ ...all, ...late }));
    setFinished(true);
  };

  // The result sits above what may be hundreds of cards: bring it into view.
  useEffect(() => {
    if (finished) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [finished]);

  // Esc finishes, as it ends a quiz; not while a Japanese keyboard is converting (Esc cancels that).
  useHotkeys(
    {
      Escape: (event) => {
        if (!event.isComposing) finish();
      },
    },
    hydrated && !finished && items.length > 0,
  );

  const restart = () => {
    setSeed(newSeed());
    setCards({});
    checked.current.clear();
    tried.current.clear();
    setFinished(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Missed, or right only after another try: worth a focused quiz.
  const toPractise = items.filter((i) => stateOf(i.id).firstTry !== true).map((i) => i.id);

  if (!hydrated) return <div className="flex-1" />;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 md:px-8">
      <header className="pt-safe sticky top-0 z-20 -mx-4 border-b border-line bg-ink-950/80 px-4 backdrop-blur-xl md:-mx-8 md:px-8">
        <div className="flex h-14 items-center gap-4">
          <Link
            href="/practice"
            aria-label="Back to practice"
            className="-ml-2 flex size-10 items-center justify-center rounded-full text-mist transition-colors hover:bg-veil/5 hover:text-paper"
          >
            <X className="size-5" strokeWidth={1.5} />
          </Link>
          <p className="hidden font-display text-[11px] tracking-[0.3em] text-mist uppercase sm:block">All at once</p>
          <div className="flex-1">
            <ProgressBar value={items.length ? rightCount / items.length : 0} />
          </div>
          <span className="text-xs text-mist tabular-nums">
            {rightCount} / {items.length}
          </span>
          <MuteButton />
        </div>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
          <p className="text-sm text-mist">Pick some kana, kanji or words on the Practice page first.</p>
          <LinkButton href="/practice" variant="primary">
            Choose sets <ArrowRight className="size-4" />
          </LinkButton>
        </div>
      ) : (
        <>
          {finished ? (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass mt-6 flex flex-col gap-5 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
            >
              <div>
                <p className="eyebrow">{perfect ? "Perfect" : "Result"}</p>
                <p className="mt-1 font-mincho text-4xl text-paper tabular-nums">
                  {rightCount} <span className="text-2xl text-mist">/ {items.length}</span>
                </p>
                <p className="mt-1 text-xs text-mist">
                  {perfect
                    ? `Every card right${retriedCount > 0 ? `, ${firstTryCount} of them first time` : " first time"}.`
                    : `${firstTryCount} right first time${retriedCount > 0 ? ` · ${retriedCount} after another try` : ""} · ${items.length - rightCount} to learn. Missed cards show their answers in red.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {toPractise.length > 0 && (
                  <Button
                    variant="primary"
                    onClick={() => startSession(toPractise, { length: Math.min(20, toPractise.length * 2) })}
                  >
                    <Target className="size-4" />
                    {perfect ? `Review the ${toPractise.length} I got wrong first` : `Quiz the ${toPractise.length} I missed`}
                  </Button>
                )}
                <Button onClick={restart}>
                  <RotateCcw className="size-4" /> Try again
                </Button>
              </div>
            </motion.section>
          ) : (
            <section className="mt-6 max-w-2xl">
              <h1 className="font-mincho text-3xl text-paper">Type what you know</h1>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-mist marker:text-smoke">
                <li>Type the romaji for kana, or a reading or the meaning for kanji and words.</li>
                <li>
                  Press Enter or Tab to check and move on. Right cards turn gold; wrong ones stay red, and after the last
                  card you loop back round to them.
                </li>
                <li>Skip any you don&apos;t know, and press Finish (or Esc) when you&apos;re done.</li>
              </ul>
            </section>
          )}

          <div
            ref={grid}
            className="mt-6 grid grid-cols-3 gap-2 pb-32 sm:grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] sm:gap-2.5"
          >
            {ordered.map((item) => (
              <GridCard
                key={item.id}
                item={item}
                shown={writtenItem(item, writing)}
                state={stateOf(item.id)}
                finished={finished}
                onCheck={(input, how) => check(item, input, how)}
                inputRef={(el) => {
                  if (el) inputs.current.set(item.id, el);
                  else inputs.current.delete(item.id);
                }}
                onPlay={() => speak(speechText(item))}
              />
            ))}
          </div>

          {/* Always in reach at the bottom, however far down the grid you are. */}
          <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink-950/85 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
              <p className="min-w-0 text-xs text-mist tabular-nums">
                {rightCount} of {items.length} right
                {!finished && untriedCount === 0 && !perfect && (
                  <span className="block text-paper sm:inline"> · every card tried: fix the red ones or finish</span>
                )}
              </p>
              {finished ? (
                <div className="flex shrink-0 gap-2">
                  {toPractise.length > 0 && (
                    <Button
                      variant="primary"
                      onClick={() => startSession(toPractise, { length: Math.min(20, toPractise.length * 2) })}
                    >
                      <Target className="size-4" /> {perfect ? "Review" : "Quiz missed"}
                    </Button>
                  )}
                  <Button onClick={restart}>
                    <RotateCcw className="size-4" /> Try again
                  </Button>
                </div>
              ) : (
                <div className="flex shrink-0 items-center gap-3">
                  <kbd className="hidden rounded border border-veil/15 px-1.5 py-0.5 font-sans text-[10px] text-mist pointer-fine:inline">
                    Esc
                  </kbd>
                  <Button variant="primary" onClick={finish}>
                    Finish <ArrowRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
