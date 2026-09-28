"use client";

import { Volume2 } from "lucide-react";
import { motion } from "motion/react";
import { useSpeech } from "@/hooks/useSpeech";
import { cn } from "@/lib/cn";

interface SpeakButtonProps {
  text: string;
  className?: string;
  size?: "sm" | "md";
}

export function SpeakButton({ text, className, size = "md" }: SpeakButtonProps) {
  const { supported, speaking, speak } = useSpeech();
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      aria-label="Play pronunciation"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full border border-line text-mist transition-colors hover:border-white/25 hover:text-paper",
        size === "md" ? "size-11" : "size-9",
        speaking && "border-gold/60 text-gold-bright",
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
      <Volume2 className={size === "md" ? "size-[18px]" : "size-4"} strokeWidth={1.6} />
    </button>
  );
}
