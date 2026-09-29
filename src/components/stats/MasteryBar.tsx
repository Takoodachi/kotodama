import { proficiency, type Breakdown } from "@/lib/analytics";

/** Mastered → known → learning, one hue stepping down in brightness, on a track of the same family. */
export const STATE_STYLE = {
  mastered: { fill: "var(--heat-4)", label: "Mastered" },
  known: { fill: "var(--heat-3)", label: "Known" },
  learning: { fill: "var(--chart-learning)", label: "Learning" },
} as const;

const ORDER = ["mastered", "known", "learning"] as const;

interface MasteryBarProps {
  label: React.ReactNode;
  counts: Breakdown;
}

/** One set's progress as a stacked meter, with the known share as its value. */
export function MasteryBar({ label, counts }: MasteryBarProps) {
  const pct = Math.round(proficiency(counts) * 100);
  const title = `${counts.mastered} mastered, ${counts.known} known, ${counts.learning} learning, ${counts.new} not started`;
  return (
    <div className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,10rem)_1fr_auto]">
      <div className="min-w-0 truncate text-sm text-paper">{label}</div>
      <div
        className="flex h-2 gap-[2px] overflow-hidden rounded-full bg-gold/[0.09]"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={title}
        title={title}
      >
        {ORDER.map((state) => {
          const share = counts.total ? counts[state] / counts.total : 0;
          if (!share) return null;
          return (
            <span
              key={state}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${share * 100}%`, background: STATE_STYLE[state].fill }}
            />
          );
        })}
      </div>
      <div className="w-24 text-right text-xs text-mist tabular-nums">
        <span className="text-paper">{pct}%</span> known
        <span className="block text-[10px] text-smoke">
          {counts.known + counts.mastered} / {counts.total}
        </span>
      </div>
    </div>
  );
}

export function MasteryLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[11px] text-mist">
      {ORDER.map((state) => (
        <span key={state} className="flex items-center gap-1.5">
          <span className="h-2 w-3.5 rounded-full" style={{ background: STATE_STYLE[state].fill }} />
          {STATE_STYLE[state].label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-3.5 rounded-full bg-gold/[0.09]" />
        Not started
      </span>
    </div>
  );
}
