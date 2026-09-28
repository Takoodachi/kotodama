"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { BELOW_HEADER } from "@/components/layout/nav";
import { GhostModeButton } from "@/components/practice/GhostModeButton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SECTIONS, groupIdsOfSection } from "@/data/groups";
import { itemsForGroups } from "@/data/library";
import { useActiveSection } from "@/hooks/useActiveSection";
import { useHydrated } from "@/hooks/useHydrated";
import { useStartSession } from "@/hooks/useStartSession";
import { cn } from "@/lib/cn";
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

export function SelectionScreen() {
  const hydrated = useHydrated();
  const settings = useSettings();
  const records = useProgress((s) => s.records);
  const startSession = useStartSession();

  const selected = useMemo(() => new Set(settings.selected), [settings.selected]);
  const items = useMemo(() => itemsForGroups(settings.selected), [settings.selected]);

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

  const start = () => startSession(items.map((i) => i.id));
  const activeSection = useActiveSection(SECTIONS.map((section) => `section-${section.id}`));

  const sessionSetup = (
    <div className="glass space-y-6 rounded-2xl p-4 sm:p-6">
      <div>
        <Label>Mode</Label>
        <ModePicker value={settings.mode} onChange={settings.setMode} />
      </div>
      <div>
        <Label>Directions</Label>
        <DirectionPicker
          mode={settings.mode}
          enabled={settings.directions[settings.mode]}
          onToggle={(d) => settings.toggleDirection(settings.mode, d)}
        />
        <p className="mt-2 text-[11px] leading-relaxed text-smoke">
          Kana always quiz reading. Each card uses a direction that suits it.
        </p>
      </div>
      <div>
        <Label>Written in · words, phrases & sentences</Label>
        <WritingPicker value={settings.writing} furigana={settings.furigana} onToggle={settings.toggleWriting} />
      </div>
      <div>
        <Label>Session length</Label>
        <SegmentedControl
          label="Session length"
          value={settings.sessionLength}
          onChange={settings.setSessionLength}
          options={LENGTHS}
        />
      </div>
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
                      ? "border-white/25 bg-white/[0.08] text-paper"
                      : "border-line text-mist hover:border-white/20 hover:text-paper",
                  )}
                >
                  {section.title}
                  {sectionCounts[section.id] > 0 && (
                    <span className="rounded-full bg-crimson px-1.5 text-[10px] text-paper tabular-nums shadow-[0_0_10px_rgb(200_16_46/0.6)]">
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
            <StartBar docked itemCount={items.length} mode={settings.mode} sessionLength={settings.sessionLength} onStart={start} />
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

      <StartBar itemCount={items.length} mode={settings.mode} sessionLength={settings.sessionLength} onStart={start} />
    </motion.div>
  );
}
