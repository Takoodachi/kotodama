"use client";

import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

interface AddButtonProps {
  /** Whether the entry is in the quiz already; pressing the button then takes it out. */
  added: boolean;
  /** Being added: a word from a JLPT level waits for the level's words to arrive. */
  busy?: boolean;
  /** What the entry is called, for screen readers. */
  name: string;
  onClick: () => void;
}

/** Puts a dictionary entry in the learner's own quiz, and shows that it is there. */
export function AddButton({ added, busy, name, onClick }: AddButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={added}
      aria-label={added ? `${name}: in your quiz. Remove it` : `Add ${name} to your quiz`}
      title={added ? "In your quiz: press to take it out" : "Add to your quiz"}
      disabled={busy}
      onClick={onClick}
      className={cn(
        "flex h-8 shrink-0 items-center gap-1 rounded-full border pr-3 pl-2 text-xs whitespace-nowrap transition-colors disabled:opacity-60",
        added
          ? "border-gold/50 bg-gold/[0.08] text-gold-bright hover:border-gold"
          : "border-veil/25 text-paper hover:border-gold/60 hover:text-gold-bright",
      )}
    >
      {added ? <Check className="size-3.5" strokeWidth={2} /> : <Plus className="size-3.5" strokeWidth={2} />}
      {busy ? "Adding…" : added ? "Added" : "Add"}
    </button>
  );
}
