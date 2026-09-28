"use client";

import { ArrowRight, Flame, Layers, Sparkles, Target } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { Button, LinkButton } from "@/components/ui/Button";
import { ITEMS_BY_CATEGORY, ITEMS_BY_ID, itemsForGroups } from "@/data/library";
import type { Category } from "@/data/types";
import { useHydrated } from "@/hooks/useHydrated";
import { useStartSession } from "@/hooks/useStartSession";
import { isDue, isMastered, isWeak, priority } from "@/lib/srs";
import { currentStreak, useProgress } from "@/store/progress";
import { useSettings } from "@/store/settings";

const LIBRARY_TILES: { category: Category; jp: string; label: string; section: string }[] = [
  { category: "hiragana", jp: "ひらがな", label: "Hiragana", section: "hiragana" },
  { category: "katakana", jp: "カタカナ", label: "Katakana", section: "katakana" },
  { category: "kanji", jp: "漢字", label: "Kanji", section: "kanji" },
  { category: "vocab", jp: "単語", label: "Words", section: "vocab" },
  { category: "phrase", jp: "表現", label: "Phrases", section: "phrase" },
  { category: "sentence", jp: "文", label: "Sentences", section: "sentence" },
];

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] as const },
});

function Stat({ icon: Icon, value, label }: { icon: typeof Flame; value: string; label: string }) {
  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <Icon className="size-4 text-gold" strokeWidth={1.5} />
      <p className="mt-3 font-mincho text-3xl text-paper tabular-nums sm:text-4xl">{value}</p>
      <p className="mt-1 text-[11px] tracking-[0.16em] text-mist uppercase">{label}</p>
    </div>
  );
}

export function HomeScreen() {
  const hydrated = useHydrated();
  const records = useProgress((s) => s.records);
  const streak = useProgress((s) => s.streak);
  const selected = useSettings((s) => s.selected);
  const startSession = useStartSession();
  // Captured once per visit; the dashboard doesn't need to tick.
  const [now] = useState(() => Date.now());

  const stats = useMemo(() => {
    const entries = Object.entries(records).filter(([id]) => ITEMS_BY_ID.has(id));
    const review = entries
      .filter(([, r]) => isDue(r, now) || isWeak(r))
      .sort(([, a], [, b]) => priority(b, now) - priority(a, now))
      .slice(0, 30)
      .map(([id]) => id);
    return {
      seen: entries.length,
      mastered: entries.filter(([, r]) => isMastered(r)).length,
      due: entries.filter(([, r]) => isDue(r, now)).length,
      review,
    };
  }, [records, now]);

  const selectedCount = useMemo(() => itemsForGroups(selected).length, [selected]);
  const show = (value: number) => (hydrated ? String(value) : "—");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
      <section className="relative grid min-h-[62vh] items-center gap-8 pt-8 pb-10 md:grid-cols-[1fr_auto] md:pt-16">
        <div>
          <motion.p {...rise(0.1)} className="eyebrow">
            言霊 · The spirit of words
          </motion.p>
          <motion.h1 {...rise(0.25)} className="mt-5 font-mincho text-5xl leading-[1.08] text-paper sm:text-6xl md:text-7xl">
            Words carry
            <br />
            a <span className="text-gold-metal">spirit.</span>
          </motion.h1>
          <motion.p {...rise(0.4)} className="mt-6 max-w-md text-[15px] leading-relaxed text-mist">
            A quiet place to practice Japanese: kana, kanji, words, phrases and full sentences. Every
            answer is remembered, and whatever you miss comes back sooner.
          </motion.p>
          <motion.div {...rise(0.55)} className="mt-9 flex flex-wrap gap-3">
            <LinkButton href="/practice" variant="primary" size="lg" split="Begin practice">
              <ArrowRight className="size-4" />
            </LinkButton>
            {hydrated && stats.review.length > 0 && (
              <Button variant="gold" size="lg" onClick={() => startSession(stats.review, { length: Math.min(20, stats.review.length * 2) })}>
                <Target className="size-4" /> Review {stats.review.length} weak & due
              </Button>
            )}
            {hydrated && stats.review.length === 0 && selectedCount > 0 && (
              <Button variant="ghost" size="lg" onClick={() => startSession(itemsForGroups(selected).map((i) => i.id))}>
                Quick start · {selectedCount} items
              </Button>
            )}
          </motion.div>
        </div>

        <motion.div
          aria-hidden
          initial={{ opacity: 0, filter: "blur(12px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 2, delay: 0.2 }}
          className="pointer-events-none absolute top-6 right-0 flex gap-3 select-none md:static"
        >
          <span className="jp font-mincho text-[7rem] leading-none text-paper/[0.06] [writing-mode:vertical-rl] md:text-[11rem] md:text-paper/90">
            言霊
          </span>
          <span className="jp mt-2 hidden text-xs tracking-[0.6em] text-smoke [writing-mode:vertical-rl] md:block">
            ことだま
          </span>
        </motion.div>
      </section>

      <motion.section {...rise(0.7)} aria-label="Your progress" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Flame} value={hydrated ? String(currentStreak(streak)) : "—"} label="Day streak" />
        <Stat icon={Layers} value={show(stats.seen)} label="Items studied" />
        <Stat icon={Sparkles} value={show(stats.mastered)} label="Mastered" />
        <Stat icon={Target} value={show(stats.due)} label="Due now" />
      </motion.section>

      <motion.section {...rise(0.85)} className="mt-14">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="eyebrow">Library</p>
            <h2 className="mt-1.5 font-mincho text-2xl text-paper">What&apos;s inside</h2>
          </div>
          <Link href="/practice" className="text-xs tracking-wide text-mist hover:text-paper">
            Choose sets →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {LIBRARY_TILES.map((tile) => (
            <Link
              key={tile.category}
              href={`/practice#section-${tile.section}`}
              className="glass group rounded-2xl p-4 transition-colors hover:border-white/20"
            >
              <p className="jp text-2xl text-paper transition-colors group-hover:text-gold-bright">{tile.jp}</p>
              <p className="mt-3 text-xs text-mist">
                {tile.label} · <span className="tabular-nums">{ITEMS_BY_CATEGORY.get(tile.category)?.length ?? 0}</span>
              </p>
            </Link>
          ))}
        </div>
      </motion.section>

      <motion.section {...rise(1)} className="glass mt-14 mb-6 flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="eyebrow">Take it with you</p>
          <p className="mt-1.5 text-sm text-mist">Install Kotodama on your phone. It works offline, like a native app.</p>
        </div>
        <InstallPrompt />
      </motion.section>
    </div>
  );
}
