"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { groupIdsOfSection, type SectionDef } from "@/data/groups";
import { ITEMS_BY_GROUP, itemsForGroups } from "@/data/library";
import { cn } from "@/lib/cn";
import { mastery, type SrsRecord } from "@/lib/srs";
import { GroupChip } from "./GroupChip";

interface SectionPanelProps {
  section: SectionDef;
  selected: ReadonlySet<string>;
  records: Record<string, SrsRecord>;
  kanjiGrouping: "jlpt" | "grade";
  onKanjiGrouping: (grouping: "jlpt" | "grade") => void;
  onToggle: (groupId: string) => void;
  onSetGroups: (groupIds: string[], on: boolean) => void;
}

function AllPill({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3.5 text-[11px] tracking-[0.14em] uppercase transition-colors",
        on
          ? "border-crimson/80 bg-crimson/15 text-paper shadow-[0_0_22px_-4px_rgb(200_16_46/0.85),inset_0_0_0_1px_rgb(200_16_46/0.35)]"
          : "border-line text-mist hover:border-veil/25 hover:text-paper",
      )}
    >
      {label}
    </button>
  );
}

const isKanaSection = (id: string) => id === "hiragana" || id === "katakana";

export function SectionPanel({
  section,
  selected,
  records,
  kanjiGrouping,
  onKanjiGrouping,
  onToggle,
  onSetGroups,
}: SectionPanelProps) {
  const variant = section.id === "kanji" ? kanjiGrouping : undefined;
  const subsections = section.subsections.filter((sub) => !sub.variant || sub.variant === variant);
  const groupIds = groupIdsOfSection(section, variant);
  const allOn = groupIds.every((id) => selected.has(id));
  const sectionItems = itemsForGroups(groupIds);
  const selectedItems = itemsForGroups(groupIds.filter((id) => selected.has(id)));
  const kana = isKanaSection(section.id);

  return (
    <section id={`section-${section.id}`} className="glass scroll-mt-32 rounded-2xl p-4 sm:p-6 md:scroll-mt-36">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{section.title}</p>
          <h2 className="mt-1.5 flex items-baseline gap-3">
            <span className="jp text-3xl text-paper sm:text-4xl">{section.jpTitle}</span>
            <span className="text-xs text-smoke tabular-nums">
              {selectedItems.length} / {sectionItems.length}
            </span>
          </h2>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-mist">{section.blurb}</p>
        </div>
        <div className="flex items-center gap-2">
          {section.id === "kanji" && (
            <SegmentedControl
              label="Group kanji by"
              value={kanjiGrouping}
              onChange={onKanjiGrouping}
              options={[
                { value: "jlpt", label: "JLPT" },
                { value: "grade", label: "Grade" },
              ]}
              className="w-40"
            />
          )}
          <AllPill on={allOn} onClick={() => onSetGroups(groupIds, !allOn)} label={allOn ? "Clear" : "All"} />
        </div>
      </header>

      <div className="space-y-5">
        {subsections.map((sub) => {
          const ids = sub.groups.map((g) => g.id);
          const subAllOn = ids.every((id) => selected.has(id));
          return (
            <div key={sub.id}>
              {subsections.length > 1 && (
                <div className="mb-2.5 flex items-center justify-between">
                  <h3 className="text-[11px] tracking-[0.2em] text-smoke uppercase">{sub.title}</h3>
                  <button
                    type="button"
                    onClick={() => onSetGroups(ids, !subAllOn)}
                    className="text-[11px] tracking-wide text-mist underline-offset-4 hover:text-paper hover:underline"
                  >
                    {subAllOn ? "Clear" : "Select all"}
                  </button>
                </div>
              )}
              <div
                className={cn(
                  "grid gap-2",
                  kana ? "grid-cols-4 sm:grid-cols-6 lg:grid-cols-7" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
                )}
              >
                {sub.groups.map((group) => {
                  const items = ITEMS_BY_GROUP.get(group.id) ?? [];
                  return (
                    <GroupChip
                      key={group.id}
                      label={group.label}
                      sublabel={group.sublabel}
                      count={kana ? undefined : items.length}
                      wide={!kana}
                      selected={selected.has(group.id)}
                      mastery={mastery(
                        items.map((i) => i.id),
                        records,
                      )}
                      onToggle={() => onToggle(group.id)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
