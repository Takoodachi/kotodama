"use client";

import { ArrowRight, RotateCcw, Target, X } from "lucide-react";
import { motion, useAnimate } from "motion/react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { MuteButton } from "@/components/ui/MuteButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { itemsForGroups, speechText, writtenItem } from "@/data/library";
import type { StudyItem } from "@/data/types";
import { useHydrated } from "@/hooks/useHydrated";
import { useSpeech } from "@/hooks/useSpeech";
import { useStartSession } from "@/hooks/useStartSession";
import { cn } from "@/lib/cn";
import { GRID_CATEGORIES } from "@/lib/quiz/directions";
import { checkGridAnswer, gridAnswer, gridHint } from "@/lib/quiz/grid";
import { seededRng, shuffle } from "@/lib/random";
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

function glyphSize(text: string): string {
  const length = [...text].length;
  if (length <= 2) return "text-4xl";
  if (length <= 4) return "text-3xl";
  return "text-2xl";
}

interface CardProps {
  item: StudyItem;
  shown: StudyItem;
  state: CardState;
  finished: boolean;
  /**
   * Checks the typed answer, on Enter or when leaving the field; returns
   * whether it was right, or null if there was nothing new to check.
   */
  onCheck: (input: HTMLInputElement, how: "enter" | "leave") => boolean | null;
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
  const wide = [...shown.surface].length > 4;

  return (
    <div
      ref={scope}
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-2xl border px-2.5 pt-3 pb-2.5 text-center transition-colors duration-300",
        wide && "col-span-2",
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
        className={cn("jp leading-tight text-paper", glyphSize(shown.surface), revealed && "cursor-pointer")}
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
          placeholder={gridHint(item)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="next"
          onKeyDown={(event) => {
            // The Enter that confirms a Japanese keyboard's conversion isn't a submit.
            if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return;
            event.preventDefault();
            if (onCheck(event.currentTarget, "enter") === false) shake();
          }}
          // Tab, or tapping another card, checks the answer too.
          onBlur={(event) => {
            if (onCheck(event.currentTarget, "leave") === false) shake();
          }}
          className={cn(
            "h-9 w-full min-w-0 rounded-lg border bg-veil/[0.04] px-2 text-center text-sm text-paper outline-none transition-colors placeholder:text-[10px] placeholder:text-smoke focus:border-gold/60",
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

  const stateOf = (id: string) => cards[id] ?? UNTRIED;
  const rightCount = items.filter((i) => stateOf(i.id).status === "right").length;
  const firstTryCount = items.filter((i) => stateOf(i.id).firstTry === true).length;
  const retriedCount = rightCount - firstTryCount;

  /** Moves to the next card still waiting for an answer, wrapping around. */
  const focusNext = (fromId: string) => {
    const start = items.findIndex((i) => i.id === fromId);
    for (let step = 1; step <= items.length; step++) {
      const next = items[(start + step) % items.length];
      const input = inputs.current.get(next.id);
      if (next.id !== fromId && input) return input.focus();
    }
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

  const check = (item: StudyItem, input: HTMLInputElement, how: "enter" | "leave"): boolean | null => {
    const value = input.value.trim();
    // Nothing new to check: Enter moves on, as a skip.
    if (!value || checked.current.get(item.id) === value) {
      if (how === "enter") focusNext(item.id);
      return null;
    }
    const next = grade(item, value, stateOf(item.id));
    setCards((all) => ({ ...all, [item.id]: next }));
    const correct = next.status === "right";
    if (correct && autoplay !== "off") speak(speechText(item));
    if (how === "enter") {
      if (correct) focusNext(item.id);
      else input.select();
    }
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
                <p className="eyebrow">Result</p>
                <p className="mt-1 font-mincho text-4xl text-paper tabular-nums">
                  {rightCount} <span className="text-2xl text-mist">/ {items.length}</span>
                </p>
                <p className="mt-1 text-xs text-mist">
                  {firstTryCount} right first time
                  {retriedCount > 0 && ` · ${retriedCount} after another try`} · {items.length - rightCount} to learn.
                  Missed cards show their answers in red.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {toPractise.length > 0 && (
                  <Button
                    variant="primary"
                    onClick={() => startSession(toPractise, { length: Math.min(20, toPractise.length * 2) })}
                  >
                    <Target className="size-4" /> Quiz the {toPractise.length} I missed
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
                <li>Press Enter, or just move to another card, to check. Right cards turn gold; wrong ones can be tried again.</li>
                <li>Skip any you don&apos;t know, and press Finish when you&apos;re done.</li>
              </ul>
            </section>
          )}

          <div className="mt-6 grid grid-flow-dense grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2.5 pb-32">
            {items.map((item) => (
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

          {!finished && (
            <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink-950/85 backdrop-blur-xl">
              <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
                <p className="text-xs text-mist tabular-nums">
                  {rightCount} of {items.length} right
                </p>
                <Button variant="primary" onClick={finish}>
                  Finish <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
