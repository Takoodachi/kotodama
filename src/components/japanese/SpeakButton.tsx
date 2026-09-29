"use client";

import { Lock, Volume2, VolumeX } from "lucide-react";
import { motion } from "motion/react";
import { useSpeech } from "@/hooks/useSpeech";
import { cn } from "@/lib/cn";

interface SpeakButtonProps {
  text: string;
  className?: string;
  size?: "sm" | "md";
  /**
   * Shown but not playable, e.g. before answering a reading question, where
   * hearing the word would give the answer away.
   */
  locked?: boolean;
}

export function SpeakButton({ text, className, size = "md", locked = false }: SpeakButtonProps) {
  const { supported, speaking, speak, muted } = useSpeech();
  if (!supported) return null;
  const label = muted ? "Sound is muted" : locked ? "Pronunciation plays after you answer" : "Play pronunciation";
  return (
    <button
      type="button"
      disabled={locked || muted}
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full border border-line text-mist transition-colors hover:border-veil/25 hover:text-paper",
        size === "md" ? "size-11" : "size-9",
        speaking && "border-gold/60 text-gold-bright",
        (locked || muted) && "cursor-not-allowed opacity-40 hover:border-line hover:text-mist",
        className,
      )}
    >
      {speaking && (
        <motion.span
          className="absolute inset-0 rounded-full border border-gold/50"
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 1.6 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      {muted ? (
        <VolumeX className={size === "md" ? "size-[18px]" : "size-4"} strokeWidth={1.6} />
      ) : (
        <Volume2 className={size === "md" ? "size-[18px]" : "size-4"} strokeWidth={1.6} />
      )}
      {locked && !muted && (
        <span className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-ink-800">
          <Lock className="size-2.5" strokeWidth={2.2} />
        </span>
      )}
    </button>
  );
}
