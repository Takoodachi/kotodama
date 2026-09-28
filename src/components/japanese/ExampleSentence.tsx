"use client";

import { Volume2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { exampleTarget, writtenItem } from "@/data/library";
import type { StudyItem } from "@/data/types";
import { useSpeech } from "@/hooks/useSpeech";
import { cn } from "@/lib/cn";
import { toSurface } from "@/lib/furigana";
import { ALL_SCRIPTS, type Script } from "@/lib/writing";
import type { FuriganaMode } from "@/store/settings";
import { JpText } from "./Furigana";

interface ExampleSentenceProps {
  item: StudyItem;
  /** Scripts to write the sentence in (words, phrases and sentences only). */
  writing?: readonly Script[];
  furigana: FuriganaMode;
  className?: string;
}

/**
 * The item used in a short sentence, with the word itself highlighted.
 * Tapping it reads the sentence aloud and reveals the translation.
 */
export function ExampleSentence({ item, writing = ALL_SCRIPTS, furigana, className }: ExampleSentenceProps) {
  const [revealed, setRevealed] = useState(false);
  const { supported, speak } = useSpeech();
  const example = writtenItem(item, writing).example;
  if (!example || !item.example) return null;
  // A one-kana target (た from 食べる written in kana) could mark the wrong character; skip it.
  const target = exampleTarget(item, writing);
  const highlight = target.length > 1 || /[\u4e00-\u9fff]/.test(target) ? target : undefined;
  const spoken = toSurface(item.example.jp);

  return (
    <button
      type="button"
      onClick={() => {
        setRevealed(true);
        speak(spoken);
      }}
      className={cn(
        "group w-full rounded-2xl border border-line bg-white/[0.025] px-4 py-3 text-left transition-colors hover:border-white/20 hover:bg-white/[0.04]",
        className,
      )}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-[10px] tracking-[0.2em] text-smoke uppercase">
          <span lang="ja" className="jp mr-1.5 text-xs tracking-normal">例文</span>Example
        </span>
        {supported && <Volume2 className="size-3.5 text-smoke transition-colors group-hover:text-gold-bright" />}
      </span>
      <JpText
        text={example.jp}
        ruby={furigana === "hide" ? "none" : "show"}
        highlight={highlight}
        className="mt-1 block text-lg leading-[2] text-paper"
      />
      <AnimatePresence initial={false} mode="wait">
        {revealed ? (
          <motion.span
            key="en"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="block text-sm text-mist"
          >
            {example.en}
          </motion.span>
        ) : (
          <motion.span key="hint" exit={{ opacity: 0 }} className="block text-xs text-smoke">
            Tap to hear it and see the translation
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
