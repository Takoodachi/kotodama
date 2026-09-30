"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { BELOW_HEADER } from "@/components/layout/nav";
import { GhostModeButton } from "@/components/practice/GhostModeButton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SECTIONS, groupIdsOfSection } from "@/data/groups";
import { itemsForGroups, WRITTEN_CATEGORIES } from "@/data/library";
import type { Category } from "@/data/types";
import { useActiveSection } from "@/hooks/useActiveSection";
import { useHydrated } from "@/hooks/useHydrated";
import { useStartSession } from "@/hooks/useStartSession";
import { useTouchDevice } from "@/hooks/useTouchDevice";
import { CATEGORY_LABELS } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { availableModes, GRID_CATEGORIES, shownMode } from "@/lib/quiz/directions";
import { useProgress } from "@/store/progress";
import { useSettings, type SessionLength } from "@/store/settings";
import { DirectionPicker } from "./DirectionPicker";
import { ModePicker } from "./ModePicker";
import { PresetBar } from "./PresetBar";
import { SectionPanel } from "./SectionPanel";
import { StartBar } from "./StartBar";
import { WritingPicker } from "./WritingPicker";

const LENGTHS: { value: SessionLength; label: string }[] = [
  { value: 10, label: "10" },
  { value: 20, label: "20" },
  { value: 30, label: "30" },
  { value: 50, label: "50" },
  { value: 0, label: "∞" },
];

function Label({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2.5 text-[11px] tracking-[0.2em] text-smoke uppercase">{children}</h3>;
}

/** "words, phrases & grammar" */
function listKinds(categories: Category[]): string {
  const names = categories.map((c) => CATEGORY_LABELS[c].en.toLowerCase());
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} & ${names.at(-1)}`;
}

export function SelectionScreen() {
  const hydrated = useHydrated();
  const settings = useSettings();
  const records = useProgress((s) => s.records);
  const startSession = useStartSession();
  const router = useRouter();
  const touch = useTouchDevice();
  const mode = shownMode(settings.mode, touch);

  const selected = useMemo(() => new Set(settings.selected), [settings.selected]);
  const items = useMemo(() => itemsForGroups(settings.selected), [settings.selected]);
  const categories = useMemo(() => new Set(items.map((i) => i.category)), [items]);
  // The grid only shows short items with a reading: kana, kanji and words.
  const gridCount = useMemo(() => items.filter((i) => GRID_CATEGORIES.has(i.category)).length, [items]);
  // "Written in" only matters when something written with words is selected.
  const writtenKinds = [...WRITTEN_CATEGORIES].filter(
    (c) => categories.has(c) && (mode !== "grid" || GRID_CATEGORIES.has(c)),
  );

  const sectionCounts = useMemo(
    () =>
      Object.fromEntries(
        SECTIONS.map((section) => {
          const ids = groupIdsOfSection(section).filter((id) => selected.has(id));
          return [section.id, itemsForGroups(ids).length];
        }),
      ),
    [selected],
  );

  const start = () => (mode === "grid" ? router.push("/all") : startSession(items.map((i) => i.id)));
  const activeSection = useActiveSection(SECTIONS.map((section) => `section-${section.id}`));

  const sessionSetup = (
    <div className="glass space-y-6 rounded-2xl p-4 sm:p-6">
      <div>
        <Label>Mode</Label>
        <ModePicker modes={availableModes(touch)} value={mode} onChange={settings.setMode} />
      </div>
      {mode === "grid" ? (
        <div>
          <Label>How it works</Label>
          <ul className="space-y-1.5 text-xs leading-relaxed text-mist">
            <li>Every selected card is laid out on one page, shuffled.</li>
            <li>
              Type what you know and press Enter or Tab: <span className="text-paper">romaji</span> for kana, any{" "}
              <span className="text-paper">reading or the meaning</span> for kanji and words.
            </li>
            <li>Wrong ones stay red, and after the last card you loop back round to them.</li>
            <li>Finish whenever you like to see what you missed.</li>
            {gridCount < items.length && (
              <li className="text-smoke">Phrases, sentences and grammar are left out: they&apos;re too long for a grid.</li>
            )}
          </ul>
        </div>
      ) : (
        <div>
          <Label>Directions</Label>
          <DirectionPicker
            mode={mode}
            enabled={settings.directions[mode]}
            onToggle={(d) => settings.toggleDirection(mode, d)}
            categories={categories}
          />
        </div>
      )}
      {writtenKinds.length > 0 && (
        <div>
          <Label>Written in · {listKinds(writtenKinds)}</Label>
          <WritingPicker value={settings.writing} furigana={settings.furigana} onToggle={settings.toggleWriting} />
        </div>
      )}
      {mode !== "grid" && (
        <div>
          <Label>Session length</Label>
          <SegmentedControl
            label="Session length"
            value={settings.sessionLength}
            onChange={settings.setSessionLength}
            options={LENGTHS}
          />
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={false}
      animate={{ opacity: hydrated ? 1 : 0 }}
      transition={{ duration: 0.4 }}
      className="w-full pb-40 lg:pb-16"
    >
      <div className="mx-auto max-w-6xl px-4 pt-4 md:px-8 md:pt-8">
        <header className="mb-5 md:mb-6">
          <p className="eyebrow">練習 · Practice</p>
          <h1 className="mt-2 font-mincho text-3xl leading-tight text-paper md:text-5xl">Choose what to practice</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
            Mix any sets you like: a katakana row, a kanji level and a handful of phrases can all go in one session.
          </p>
        </header>
        <PresetBar selected={selected} onToggle={settings.setGroups} onClear={() => settings.setSelection([])} />
      </div>

      {/* Full-width frosted bar that docks flush under the header. */}
      <nav
        aria-label="Sections"
        className={cn("sticky z-20 mt-3 mb-6 border-y border-line bg-ink-950/75 backdrop-blur-xl", BELOW_HEADER)}
      >
        <ul className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] md:px-8">
          {SECTIONS.map((section) => {
            const current = activeSection === `section-${section.id}`;
            return (
              <li key={section.id}>
                <a
                  href={`#section-${section.id}`}
                  aria-current={current ? "location" : undefined}
                  className={cn(
                    "flex h-8 items-center gap-2 rounded-full border px-3.5 text-xs whitespace-nowrap transition-colors",
                    current
                      ? "border-veil/25 bg-veil/[0.08] text-paper"
                      : "border-line text-mist hover:border-veil/20 hover:text-paper",
                  )}
                >
                  {section.title}
                  {sectionCounts[section.id] > 0 && (
                    <span className="rounded-full bg-crimson px-1.5 text-[10px] text-on-accent tabular-nums shadow-[0_0_10px_rgb(200_16_46/0.6)]">
                      {sectionCounts[section.id]}
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 md:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <aside className="space-y-4 lg:sticky lg:top-40 lg:order-last lg:self-start">
          {sessionSetup}
          <div className="hidden lg:block">
            <StartBar
              docked
              itemCount={mode === "grid" ? gridCount : items.length}
              mode={mode}
              sessionLength={settings.sessionLength}
              onStart={start}
            />
          </div>
          <GhostModeButton className="w-full" compact />
        </aside>

        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <SectionPanel
              key={section.id}
              section={section}
              selected={selected}
              records={records}
              kanjiGrouping={settings.kanjiGrouping}
              onKanjiGrouping={settings.setKanjiGrouping}
              onToggle={settings.toggleGroup}
              onSetGroups={settings.setGroups}
            />
          ))}
        </div>
      </div>

      <StartBar
        itemCount={mode === "grid" ? gridCount : items.length}
        mode={mode}
        sessionLength={settings.sessionLength}
        onStart={start}
      />
    </motion.div>
  );
}
