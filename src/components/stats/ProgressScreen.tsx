"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { JpText } from "@/components/japanese/Furigana";
import { SpeakButton } from "@/components/japanese/SpeakButton";
import { GhostModeButton } from "@/components/practice/GhostModeButton";
import { LinkButton } from "@/components/ui/Button";
import { SECTIONS } from "@/data/groups";
import { ITEMS_BY_CATEGORY, ITEMS_BY_ID, itemsForGroups, romajiLabel, speechText } from "@/data/library";
import type { Category } from "@/data/types";
import { useHydrated } from "@/hooks/useHydrated";
import { plural } from "@/lib/plural";
import { accuracy, breakdown, CATEGORIES, CATEGORY_LABELS, proficiency, weakestItems } from "@/lib/analytics";
import { useProgress } from "@/store/progress";
import { MasteryBar, MasteryLegend } from "./MasteryBar";
import { RadarChart, type RadarDatum } from "./RadarChart";

const SECTION_CATEGORY: Record<string, Category> = {
  hiragana: "hiragana",
  katakana: "katakana",
  kanji: "kanji",
  vocab: "vocab",
  phrase: "phrase",
  sentence: "sentence",
};

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <p className="text-[11px] tracking-[0.16em] text-mist uppercase">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-paper tabular-nums sm:text-4xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-smoke">{sub}</p>}
    </div>
  );
}

export function ProgressScreen() {
  const hydrated = useHydrated();
  const records = useProgress((s) => s.records);
  const totals = useProgress((s) => s.totals);

  const byCategory = useMemo(
    () => CATEGORIES.map((category) => ({ category, counts: breakdown(ITEMS_BY_CATEGORY.get(category) ?? [], records) })),
    [records],
  );

  const radar: RadarDatum[] = byCategory.map(({ category, counts }) => ({
    key: category,
    label: CATEGORY_LABELS[category].en,
    jp: CATEGORY_LABELS[category].jp,
    value: proficiency(counts),
    detail: `${counts.known + counts.mastered} of ${counts.total} known`,
  }));

  // Kana are summarised per subsection (Main, Dakuten…); everything else per set.
  const sections = useMemo(
    () =>
      SECTIONS.map((section) => ({
        section,
        rows: section.subsections
          .filter((sub) => sub.variant !== "grade")
          .flatMap((sub) =>
            section.id === "hiragana" || section.id === "katakana"
              ? [{ key: sub.id, label: sub.title, counts: breakdown(itemsForGroups(sub.groups.map((g) => g.id)), records) }]
              : sub.groups.map((g) => ({
                  key: g.id,
                  label: section.id === "kanji" ? `${g.label} kanji` : g.sublabel,
                  counts: breakdown(itemsForGroups([g.id]), records),
                })),
          ),
      })),
    [records],
  );

  const weakest = useMemo(
    () => weakestItems(records, 10, (id) => ITEMS_BY_ID.has(id)).map((id) => ({ item: ITEMS_BY_ID.get(id)!, record: records[id] })),
    [records],
  );

  const all = byCategory.reduce(
    (acc, { counts }) => ({
      total: acc.total + counts.total,
      studied: acc.studied + counts.total - counts.new,
      known: acc.known + counts.known + counts.mastered,
      mastered: acc.mastered + counts.mastered,
    }),
    { total: 0, studied: 0, known: 0, mastered: 0 },
  );
  const show = (text: string) => (hydrated ? text : "—");

  return (
    <motion.div
      initial={false}
      animate={{ opacity: hydrated ? 1 : 0 }}
      className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-4 pb-10 md:px-8 md:pt-8"
    >
      <header>
        <p className="eyebrow">進歩 · Progress</p>
        <h1 className="mt-2 font-mincho text-3xl text-paper md:text-5xl">Your mastery</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
          An item counts as <span className="text-paper">known</span> once you get it right twice in a row, and{" "}
          <span className="text-paper">mastered</span> once it has held up across a week of spaced reviews.
        </p>
      </header>

      <section aria-label="Totals" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Studied" value={show(String(all.studied))} sub={`of ${all.total} items`} />
        <Kpi label="Known" value={show(String(all.known))} sub={show(`${Math.round((all.known / all.total) * 100)}% of the library`)} />
        <Kpi label="Mastered" value={show(String(all.mastered))} />
        <Kpi
          label="Accuracy"
          value={show(totals.answered ? `${Math.round((totals.correct / totals.answered) * 100)}%` : "–")}
          sub={show(plural(totals.answered, "answer"))}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="glass rounded-2xl p-4 sm:p-6">
          <p className="eyebrow">By script & skill</p>
          <h2 className="mt-1.5 font-mincho text-2xl text-paper">Proficiency</h2>
          <p className="mt-1 text-xs text-mist">Share of each category you know.</p>
          <div className="mx-auto mt-2 max-w-md">
            <RadarChart data={radar} title="Known share by category" />
          </div>
        </div>

        <div className="glass rounded-2xl p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Overview</p>
              <h2 className="mt-1.5 font-mincho text-2xl text-paper">Categories</h2>
            </div>
            <MasteryLegend />
          </div>
          <div className="mt-5 space-y-3.5">
            {byCategory.map(({ category, counts }) => (
              <MasteryBar
                key={category}
                counts={counts}
                label={
                  <>
                    {CATEGORY_LABELS[category].en}{" "}
                    <span lang="ja" className="jp text-xs text-smoke">{CATEGORY_LABELS[category].jp}</span>
                  </>
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section className="glass rounded-2xl p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Weak spots</p>
            <h2 className="mt-1.5 font-mincho text-2xl text-paper">Lowest accuracy</h2>
          </div>
        </div>
        {weakest.length === 0 ? (
          <p className="mt-4 text-sm text-mist">Nothing yet. Answer a few questions and your trickiest items will show up here.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {weakest.map(({ item, record }) => (
              <li key={item.id} className="flex items-center gap-4 py-2.5">
                <JpText text={item.jp} className="w-20 shrink-0 truncate text-xl text-paper" ruby="none" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-paper">{item.meaning[0] ?? romajiLabel(item)}</p>
                  <p className="truncate text-xs text-mist">{romajiLabel(item)}</p>
                </div>
                <div className="text-right text-xs text-mist tabular-nums">
                  <span className="text-paper">{Math.round(accuracy(record) * 100)}%</span>
                  <span className="block text-[10px] text-smoke">
                    {record.correct}/{record.seen} right
                  </span>
                </div>
                <SpeakButton text={speechText(item)} size="sm" />
              </li>
            ))}
          </ul>
        )}
        <GhostModeButton className="mt-4 w-full" />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">In detail</p>
            <h2 className="mt-1.5 font-mincho text-2xl text-paper">Every set</h2>
          </div>
          <LinkButton href="/practice" size="md">
            Practice a set
          </LinkButton>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map(({ section, rows }) => (
            <div key={section.id} className="glass rounded-2xl p-4 sm:p-5">
              <h3 className="mb-4 flex items-baseline gap-2.5">
                <span lang="ja" className="jp text-2xl text-paper">{section.jpTitle}</span>
                <span className="text-xs text-mist">{section.title}</span>
                <span className="ml-auto text-xs text-mist tabular-nums">
                  {Math.round(proficiency(byCategory.find((c) => c.category === SECTION_CATEGORY[section.id])!.counts) * 100)}%
                </span>
              </h3>
              <div className="space-y-3">
                {rows.map((row) => (
                  <MasteryBar key={row.key} label={row.label} counts={row.counts} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
