"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ITEMS_BY_ID, speechText, writtenItem } from "@/data/library";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useHydrated } from "@/hooks/useHydrated";
import { useSpeech } from "@/hooks/useSpeech";
import { useStartSession } from "@/hooks/useStartSession";
import { checkTypedAnswer } from "@/lib/quiz/check";
import { answerSide } from "@/lib/quiz/directions";
import type { ChoiceOption } from "@/lib/quiz/distractors";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";
import { AnswerInput } from "./AnswerInput";
import { FeedbackPanel } from "./FeedbackPanel";
import { MultipleChoice } from "./MultipleChoice";
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

function Key({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-white/15 px-1.5 py-0.5 font-sans text-[10px] text-mist">{children}</kbd>;
}

/** Shortcut reminders, only on devices with a mouse and keyboard. */
function KeyboardHints({ choice, answered }: { choice: boolean; answered: boolean }) {
  return (
    <p className="mt-5 hidden items-center justify-center gap-4 text-[11px] text-smoke pointer-fine:flex" aria-hidden>
      {choice && !answered && (
        <span className="flex items-center gap-1.5">
          <Key>1</Key>–<Key>4</Key> answer
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <Key>Enter</Key> or <Key>Space</Key> {answered ? "next" : choice ? "next, once answered" : "check / next"}
      </span>
      <span className="flex items-center gap-1.5">
        <Key>Esc</Key> end
      </span>
    </p>
  );
}

export function QuizRunner() {
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useSession();
  const { status, mode, queue, index, results, length, label, writing, poolIds, answer, advance, finish, clear } = session;
  const furigana = useSettings((s) => s.furigana);
  const autoAdvance = useSettings((s) => s.autoAdvance);
  const autoplay = useSettings((s) => s.audio.autoplay);
  const kanaConverter = useSettings((s) => s.builtInIme);
  const { supported: speechSupported, speak } = useSpeech();
  // The card whose answer is being read aloud, and whether the reading has finished.
  const [spoken, setSpoken] = useState<{ key: string; done: boolean } | null>(null);
  const startSession = useStartSession();

  const question = status === "active" ? queue[index] : undefined;
  const item = question ? ITEMS_BY_ID.get(question.itemId) : undefined;
  const last = results.at(-1);
  const result = question && last?.questionKey === question.key ? last : undefined;
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
  useEffect(() => {
    if (!result || showPanel || !question || !item) return;
    const base = (mode === "choice" ? ADVANCE_DELAY.choice : ADVANCE_DELAY.typed) + readingTime(item.surface);
    const reading = spoken?.key === question.key;
    const delay = !reading ? base : spoken.done ? AFTER_SPEECH : MAX_SPEECH_WAIT;
    const timer = setTimeout(advance, delay);
    return () => clearTimeout(timer);
  }, [result, showPanel, question, item, spoken, advance, mode]);

  const onClose = useCallback(() => {
    if (results.length) finish();
    else {
      clear();
      router.push("/practice");
    }
  }, [results.length, finish, clear, router]);

  // Enter or Space moves on once answered; Escape ends the session.
  useHotkeys({ Enter: advance, " ": advance }, !!result);
  useHotkeys({ Escape: onClose }, status === "active");

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

  const respond = (given: string, correct: boolean) => {
    answer(given, correct);
    if (autoplay === "off" || !speechSupported) return;
    const key = question.key;
    setSpoken({ key, done: false });
    speak(speechText(item), () => setSpoken((s) => (s?.key === key ? { key, done: true } : s)));
  };

  const onChoose = (option: ChoiceOption) => respond(option.label, option.correct);
  const onSubmit = (given: string) => respond(given, !!given && checkTypedAnswer(item, question.direction, given));

  const side = answerSide(question.direction);
  const japaneseOptions = side === "jp" || (side === "romaji" && item.category === "kanji");

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
        onClose={onClose}
      />

      <div className="flex flex-1 flex-col justify-center py-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={question.key}
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -48 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-5"
          >
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
                japanese={japaneseOptions}
                chosen={result ? result.given : null}
                onChoose={onChoose}
              />
            ) : (
              <AnswerInput
                item={item}
                direction={question.direction}
                kanaConverter={kanaConverter}
                correct={result ? result.correct : null}
                onSubmit={onSubmit}
                onContinue={advance}
              />
            )}
          </motion.div>
        </AnimatePresence>
        <KeyboardHints choice={!!question.options} answered={!!result} />
      </div>

      <AnimatePresence>
        {showPanel && result && (
          <FeedbackPanel
            key={question.key}
            item={item}
            writing={writing}
            correct={result.correct}
            given={result.given}
            furigana={furigana}
            onContinue={advance}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
