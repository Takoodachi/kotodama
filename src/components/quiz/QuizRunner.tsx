"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ITEMS_BY_ID, speechText } from "@/data/library";
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

export function QuizRunner() {
  const router = useRouter();
  const hydrated = useHydrated();
  const session = useSession();
  const { status, mode, queue, index, results, length, poolIds, answer, advance, finish, clear } = session;
  const furigana = useSettings((s) => s.furigana);
  const autoAdvance = useSettings((s) => s.autoAdvance);
  const autoplay = useSettings((s) => s.audio.autoplay);
  const kanaConverter = useSettings((s) => s.builtInIme);
  const { speak } = useSpeech();
  const startSession = useStartSession();

  const question = status === "active" ? queue[index] : undefined;
  const item = question ? ITEMS_BY_ID.get(question.itemId) : undefined;
  const last = results.at(-1);
  const result = question && last?.questionKey === question.key ? last : undefined;
  // A correct answer with auto-advance just flashes gold and moves on.
  const showPanel = !!result && !(result.correct && autoAdvance);

  let inARow = 0;
  for (let i = results.length - 1; i >= 0 && results[i].correct; i--) inARow++;
  const correctCount = results.filter((r) => r.correct).length;

  // Nothing to show without a session (e.g. after a reload): back to the picker.
  useEffect(() => {
    if (status === "idle") router.replace("/practice");
  }, [status, router]);

  // "On reveal" audio, only where hearing the word doesn't give the answer away.
  useEffect(() => {
    if (autoplay === "reveal" && item && question?.direction === "jp-en") speak(speechText(item));
  }, [autoplay, item, question, speak]);

  useEffect(() => {
    if (!result?.correct || !autoAdvance) return;
    const timer = setTimeout(advance, mode === "choice" ? ADVANCE_DELAY.choice : ADVANCE_DELAY.typed);
    return () => clearTimeout(timer);
  }, [result, autoAdvance, advance, mode]);

  useHotkeys({ Enter: advance }, !!result && !showPanel);

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
    if (autoplay !== "off") speak(speechText(item));
  };

  const onChoose = (option: ChoiceOption) => respond(option.label, option.correct);
  const onSubmit = (given: string) => respond(given, !!given && checkTypedAnswer(item, question.direction, given));

  const onClose = () => {
    if (results.length) finish();
    else {
      clear();
      router.push("/practice");
    }
  };

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
              item={item}
              direction={question.direction}
              mode={mode}
              furigana={furigana}
              correct={result ? result.correct : null}
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
      </div>

      <AnimatePresence>
        {showPanel && result && (
          <FeedbackPanel
            key={question.key}
            item={item}
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
