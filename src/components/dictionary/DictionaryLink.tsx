"use client";

import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { cn } from "@/lib/cn";
import { DICTIONARY, unlockedEntries } from "@/lib/dictionary";
import { useProgress } from "@/store/progress";

/** Opens the dictionary from the Practice page, with how much of it is unlocked so far. */
export function DictionaryLink({ className }: { className?: string }) {
  const hydrated = useHydrated();
  const records = useProgress((s) => s.records);
  const unlocked = useMemo(() => unlockedEntries(records).size, [records]);

  return (
    <Link
      href="/practice/dictionary"
      className={cn(
        "group flex items-center gap-3 rounded-2xl border border-gold/25 bg-gold/[0.04] px-4 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-500",
        "hover:border-gold/50 hover:bg-gold/[0.08] hover:shadow-[0_0_40px_-14px_rgb(201_164_92/0.7)]",
        className,
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/[0.06] transition-transform duration-500 group-hover:-translate-y-0.5">
        <BookOpen className="size-5 text-gold-bright" strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="text-sm text-paper">Dictionary</span>
          <span lang="ja" className="jp text-xs text-smoke">
            辞書
          </span>
        </span>
        <span className="block text-xs leading-relaxed text-mist tabular-nums">
          Look up any word, in English or Japanese
          {hydrated && ` · ${unlocked.toLocaleString("en")} of ${DICTIONARY.length.toLocaleString("en")} unlocked`}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-smoke transition-[color,transform] duration-300 group-hover:translate-x-0.5 group-hover:text-gold-bright" />
    </Link>
  );
}
