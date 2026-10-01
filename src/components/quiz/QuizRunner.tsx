"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QuizDictionary } from "@/components/dictionary/QuizDictionary";
import { ITEMS_BY_ID, speechText, writtenItem } from "@/data/library";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useHydrated } from "@/hooks/useHydrated";
import { useSpeech } from "@/hooks/useSpeech";
import { useStartSession } from "@/hooks/useStartSession";
import { inDictionary } from "@/lib/dictionary";
import { checkBoth, checkTypedAnswer } from "@/lib/quiz/check";
import { answersInJapanese } from "@/lib/quiz/directions";
import type { ChoiceOption } from "@/lib/quiz/distractors";
import { useSession, type AnswerParts } from "@/store/session";
import { useSettings } from "@/store/settings";
import { AnswerInput } from "./AnswerInput";
import { FeedbackPanel } from "./FeedbackPanel";
import { MultipleChoice } from "./MultipleChoice";
import { PastCard, ReviewNav } from "./PastCard";
import { PromptCard } from "./PromptCard";
import { QuizHeader } from "./QuizHeader";
import { SessionSummary } from "./SessionSummary";

const ADVANCE_DELAY = { choice: 850, typed: 1000 };
/** Pause after the pronunciation finishes before the next card. */
const AFTER_SPEECH = 700;
/** Moves on anyway if the browser never reports the end of speech. */
const MAX_SPEECH_WAIT = 12_000;

/** Extra time to take in a longer answer (a sentence, not a single kana). */
function readingTime(text: string): number {
  return Math.min(2000, Math.max(0, [...text].length - 6) * 50);
}

/** Cards slide in from the right going forward, and from the left going back. */
const SLIDE = {
  enter: (dir: number) => ({ opacity: 0, x: 48 * dir }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: -48 * dir }),
};

function Key({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-veil/15 px-1.5 py-0.5 font-sans text-[10px] text-mist">{children}</kbd>;
}

/** Shortcut reminders, only on devices with a mouse and keyboard. */
function KeyboardHints({
  choice,
  answered,
  reviewing,
  canGoBack,
}: {
  choice: boolean;
  answered: boolean;
  reviewing: boolean;
  canGoBack: boolean;
}) {
  return (
    <p
      className="mt-5 hidden flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-smoke pointer-fine:flex"
      aria-hidden
    >
      {reviewing ? (
        <>
          <span className="flex items-center gap-1.5">
            <Key>←</Key>
            <Key>→</Key> earlier / later
          </span>
          <span className="flex items-center gap-1.5">
            <Key>Enter</Key> back to the question
          </span>
        </>
      ) : (
        <>
          {choice && !answered && (
            <span className="flex items-center gap-1.5">
              <Key>1</Key>–<Key>4</Key> answer
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Key>Enter</Key> or <Key>Space</Key> {answered ? "next" : choice ? "next, once answered" : "check / next"}
          </span>
          {canGoBack && (
            <span className="flex items-center gap-1.5">
              <Key>←</Key> previous card
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Key>Esc</Key> end
          </span>
        </>
      )}
    </p>
  );
}

export function QuizRunner() {
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useSession();
  const { status, mode, queue, index, results, length, label, writing, poolIds } = session;
  const { answer, overrule, advance, finish, clear } = session;
  const furigana = useSettings((s) => s.furigana);
  const autoAdvance = useSettings((s) => s.autoAdvance);
  const autoplay = useSettings((s) => s.audio.autoplay);
  const kanaConverter = useSettings((s) => s.builtInIme);
  const { supported: speechSupported, speak, muted } = useSpeech();
  // The card whose answer is being read aloud, and whether the reading has finished.
  const [spoken, setSpoken] = useState<{ key: string; done: boolean } | null>(null);
  // An earlier card being looked at again, by question key.
  const [reviewKey, setReviewKey] = useState<string | null>(null);
  // 1 going forward, -1 going back: which way cards slide.
  const [navDir, setNavDir] = useState(1);
  // Half-typed answer (one text per field), kept while looking at an earlier card.
  const [draft, setDraft] = useState<{ key: string; texts: string[] } | null>(null);
  // The dictionary of unlocked entries, there to consult when the session has words, phrases or sentences.
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const hasDictionary = useMemo(
    () =>
      poolIds.some((id) => {
        const pooled = ITEMS_BY_ID.get(id);
        return !!pooled && inDictionary(pooled);
      }),
    [poolIds],
  );
  const closeDictionary = useCallback(() => setDictionaryOpen(false), []);
  const startSession = useStartSession();

  const question = status === "active" ? queue[index] : undefined;
  const item = question ? ITEMS_BY_ID.get(question.itemId) : undefined;
  const last = results.at(-1);
  const result = question && last?.questionKey === question.key ? last : undefined;

  // Every card gets exactly one answer before the next, so results[i] is queue[i].
  const reviewAt = reviewKey === null ? -1 : results.findIndex((r) => r.questionKey === reviewKey);
  const reviewing = reviewAt >= 0 && reviewAt < index;
  const reviewed = reviewing ? results[reviewAt] : undefined;
  const reviewedQuestion = reviewed && queue[reviewAt];
  const reviewedItem = reviewed && ITEMS_BY_ID.get(reviewed.itemId);

  // A correct answer with auto-advance just flashes gold and moves on, except
  // the first time a word is met: then it stays up to show the example sentence.
  const meetingNewWord = !!result?.firstSeen && !!item?.example;
  const showPanel = !!result && (!(result.correct && autoAdvance) || meetingNewWord);

  let inARow = 0;
  for (let i = results.length - 1; i >= 0 && results[i].correct; i--) inARow++;
  const correctCount = results.filter((r) => r.correct).length;

  // Nothing to show without a session: back to the picker. Waits for the
  // saved session to load first, so a reload mid-quiz resumes instead.
  useEffect(() => {
    if (hydrated && status === "idle") router.replace("/practice");
  }, [hydrated, status, router]);

  // "On reveal" audio, only where hearing the word doesn't give the answer away.
  useEffect(() => {
    if (autoplay === "reveal" && item && question?.direction === "jp-en") speak(speechText(item));
  }, [autoplay, item, question, speak]);

  // Auto-advance after a correct answer, but never over the pronunciation:
  // while the answer is being read aloud, wait for it to finish first.
  // Paused while looking at an earlier card.
  useEffect(() => {
    if (!result || showPanel || reviewing || dictionaryOpen || !question || !item) return;
    const base = (mode === "choice" ? ADVANCE_DELAY.choice : ADVANCE_DELAY.typed) + readingTime(item.surface);
    const reading = spoken?.key === question.key;
    const delay = !reading ? base : spoken.done ? AFTER_SPEECH : MAX_SPEECH_WAIT;
    const timer = setTimeout(advance, delay);
    return () => clearTimeout(timer);
  }, [result, showPanel, reviewing, dictionaryOpen, question, item, spoken, advance, mode]);

  const onClose = useCallback(() => {
    if (results.length) finish();
    else {
      clear();
      router.push("/practice");
    }
  }, [results.length, finish, clear, router]);

  /** Shows an earlier card (by position) and reads it aloud, or returns to the question with null. */
  const lookAt = (at: number | null, dir: 1 | -1) => {
    setNavDir(dir);
    setReviewKey(at === null ? null : results[at].questionKey);
    // The earlier card is read instead, so stop waiting on the current answer's audio.
    setSpoken((s) => (s ? { ...s, done: true } : s));
    const earlier = at === null ? undefined : ITEMS_BY_ID.get(results[at].itemId);
    if (earlier && autoplay !== "off" && speechSupported) speak(speechText(earlier));
  };
  const goBack = () => {
    const from = reviewing ? reviewAt : index;
    if (from > 0) lookAt(from - 1, -1);
  };
  const goForward = () => {
    if (reviewing) lookAt(reviewAt + 1 < index ? reviewAt + 1 : null, 1);
  };
  const returnToQuestion = () => lookAt(null, 1);

  // Enter or Space moves on once answered; Escape ends the session; ← looks back.
  // All of them wait while the dictionary is open.
  const keys = status === "active" && !dictionaryOpen;
  useHotkeys({ Enter: advance, " ": advance }, keys && !!result && !reviewing);
  useHotkeys({ Escape: onClose, ArrowLeft: goBack }, keys && !reviewing);
  useHotkeys(
    { ArrowLeft: goBack, ArrowRight: goForward, Enter: returnToQuestion, " ": returnToQuestion, Escape: returnToQuestion },
    keys && reviewing,
  );

  if (!hydrated || status === "idle") return <div className="flex-1" />;

  if (status === "done") {
    return (
      <SessionSummary
        results={results}
        onPracticeMissed={(ids) => startSession(ids, { length: Math.min(20, ids.length * 2) })}
        onRepeat={() => startSession(poolIds)}
      />
    );
  }

  if (!question || !item) return <div className="flex-1" />;

  const respond = (given: string, correct: boolean, parts?: AnswerParts) => {
    answer(given, correct, parts);
    if (autoplay === "off" || !speechSupported || muted) return;
    const key = question.key;
    setSpoken({ key, done: false });
    speak(speechText(item), () => setSpoken((s) => (s?.key === key ? { key, done: true } : s)));
  };

  const onChoose = (option: ChoiceOption) => respond(option.label, option.correct);
  const onSubmit = (given: string, meaning = "") => {
    if (question.direction !== "jp-both") return respond(given, !!given && checkTypedAnswer(item, question.direction, given));
    const right = checkBoth(item, given, meaning);
    respond([given, meaning].filter(Boolean).join(" / "), right.reading && right.meaning, {
      reading: { given, correct: right.reading },
      meaning: { given: meaning, correct: right.meaning },
    });
  };

  // An English answer marked wrong may just be worded in a way the check didn't expect:
  // the learner can count it as right. Only the meaning: a reading is checked exactly.
  const canOverrule =
    !!result &&
    !result.correct &&
    !question.options &&
    (result.parts
      ? result.parts.reading.correct && !!result.parts.meaning.given
      : question.direction === "jp-en" && !!result.given);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4">
      <QuizHeader
        position={index}
        done={results.length}
        total={queue.length}
        endless={length === 0}
        correct={correctCount}
        streak={inARow}
        ghost={label === "ghost"}
        onDictionary={hasDictionary ? () => setDictionaryOpen(true) : undefined}
        unlocked={results.filter((r) => r.unlocked).length}
        onClose={onClose}
      />
      <ReviewNav
        at={reviewing ? reviewAt : null}
        current={index}
        onBack={goBack}
        onForward={goForward}
        onReturn={returnToQuestion}
      />

      <div className="flex flex-1 flex-col justify-center pt-2 pb-6">
        <AnimatePresence mode="wait" initial={false} custom={navDir}>
          <motion.div
            key={reviewed ? reviewed.questionKey : question.key}
            custom={navDir}
            variants={SLIDE}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-5"
          >
            {reviewed && reviewedQuestion && reviewedItem ? (
              <PastCard
                item={reviewedItem}
                question={reviewedQuestion}
                result={reviewed}
                mode={mode}
                writing={writing}
                furigana={furigana}
                ghost={label === "ghost"}
              />
            ) : (
              <>
                <PromptCard
                  item={writtenItem(item, writing)}
                  direction={question.direction}
                  mode={mode}
                  furigana={furigana}
                  correct={result ? result.correct : null}
                  ghost={label === "ghost"}
                />
                {question.options ? (
                  <MultipleChoice
                    options={question.options}
                    japanese={answersInJapanese(item, question.direction)}
                    chosen={result ? result.given : null}
                    onChoose={onChoose}
                  />
                ) : (
                  <AnswerInput
                    item={item}
                    direction={question.direction}
                    kanaConverter={kanaConverter}
                    correct={result ? result.correct : null}
                    parts={
                      result?.parts && { reading: result.parts.reading.correct, meaning: result.parts.meaning.correct }
                    }
                    onSubmit={onSubmit}
                    onContinue={advance}
                    // Once answered (say, after a reload), the fields show what was given.
                    draft={
                      result
                        ? result.parts
                          ? [result.parts.reading.given, result.parts.meaning.given]
                          : [result.given]
                        : draft?.key === question.key
                          ? draft.texts
                          : undefined
                    }
                    onDraft={(texts) => setDraft({ key: question.key, texts })}
                  />
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
        <KeyboardHints choice={!!question.options} answered={!!result} reviewing={reviewing} canGoBack={index > 0} />
      </div>

      <AnimatePresence>
        {showPanel && result && !reviewing && (
          <FeedbackPanel
            key={question.key}
            item={item}
            writing={writing}
            correct={result.correct}
            given={result.given}
            parts={result.parts}
            overruled={result.overruled}
            unlocked={result.unlocked}
            onOverrule={canOverrule ? overrule : undefined}
            furigana={furigana}
            onContinue={advance}
          />
        )}
      </AnimatePresence>

      {/* The card being asked stays out of the dictionary until it's answered. */}
      <QuizDictionary open={dictionaryOpen} onClose={closeDictionary} hidden={result ? undefined : question.itemId} />
    </div>
  );
}
