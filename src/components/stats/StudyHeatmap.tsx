"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/plural";
import { localDay, type DayActivity } from "@/store/progress";

const WEEKS = 53;
const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT = 30;
const TOP = 18;
/** Rows above this show their tooltip below the cell instead of above it. */
const FLIP_BELOW_ROW = 3;

/** One hue, dark → bright on the dark surface: more answers read as more light. */
const LEVEL_FILL = ["rgb(255 255 255 / 0.05)", "#3d311b", "#6e5629", "#a8843d", "#e6c98a"];
const LEVEL_LABEL = ["No study", "1–9 answers", "10–24 answers", "25–49 answers", "50+ answers"];

function level(answered: number): number {
  if (answered <= 0) return 0;
  if (answered < 10) return 1;
  if (answered < 25) return 2;
  if (answered < 50) return 3;
  return 4;
}

interface Cell {
  day: string;
  date: Date;
  col: number;
  row: number;
  answered: number;
  correct: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateLabel = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

function buildCells(history: Record<string, DayActivity>, today: Date): Cell[] {
  // Start on the Sunday 52 weeks before this week's Sunday.
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - (WEEKS - 1) * 7);
  const cells: Cell[] = [];
  for (let i = 0; ; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    if (date > today) break;
    const day = localDay(date);
    const activity = history[day];
    cells.push({
      day,
      date,
      col: Math.floor(i / 7),
      row: i % 7,
      answered: activity?.answered ?? 0,
      correct: activity?.correct ?? 0,
    });
  }
  return cells;
}

function longestStreak(history: Record<string, DayActivity>): number {
  const days = Object.keys(history)
    .filter((d) => history[d].answered > 0)
    .sort();
  let best = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const day of days) {
    const [y, m, d] = day.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const consecutive = previous && Math.round((date.getTime() - previous.getTime()) / 86_400_000) === 1;
    run = consecutive ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}

interface StudyHeatmapProps {
  history: Record<string, DayActivity>;
  /** Captured by the caller so every render uses the same "today". */
  today: Date;
}

export function StudyHeatmap({ history, today }: StudyHeatmapProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ cell: Cell; x: number; y: number } | null>(null);
  const cells = useMemo(() => buildCells(history, today), [history, today]);
  const todayKey = localDay(today);

  const studiedDays = cells.filter((c) => c.answered > 0).length;
  const yearAnswers = cells.reduce((sum, c) => sum + c.answered, 0);
  const best = useMemo(() => longestStreak(history), [history]);

  const months = useMemo(() => {
    const labels: { col: number; text: string }[] = [];
    let lastMonth = -1;
    for (const cell of cells) {
      if (cell.row !== 0) continue;
      const month = cell.date.getMonth();
      if (month !== lastMonth) {
        // Skip a label squeezed against the left edge by the next month's.
        if (!(labels.length === 0 && cell.date.getDate() > 21)) labels.push({ col: cell.col, text: MONTHS[month] });
        lastMonth = month;
      }
    }
    return labels;
  }, [cells]);

  // Open on the most recent weeks, like GitHub on a phone.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const width = LEFT + WEEKS * STEP;
  const height = TOP + 7 * STEP;

  return (
    <div>
      <p className="sr-only">
        Studied on {studiedDays} of the last {cells.length} days, {plural(yearAnswers, "answer")} in total. Longest streak:{" "}
        {plural(best, "day")}.
      </p>
      <div ref={scroller} className="relative overflow-x-auto pb-2 [scrollbar-width:thin]" aria-hidden>
        <div className="relative" style={{ width, height }}>
          <svg width={width} height={height} onPointerLeave={() => setHover(null)} className="block">
            {months.map((m) => (
              <text key={`${m.col}-${m.text}`} x={LEFT + m.col * STEP} y={11} className="fill-smoke text-[10px]">
                {m.text}
              </text>
            ))}
            {[
              [1, "Mon"],
              [3, "Wed"],
              [5, "Fri"],
            ].map(([row, text]) => (
              <text key={text} x={0} y={TOP + (row as number) * STEP + CELL - 2} className="fill-smoke text-[10px]">
                {text}
              </text>
            ))}
            {cells.map((cell) => {
              const x = LEFT + cell.col * STEP;
              const y = TOP + cell.row * STEP;
              const isToday = cell.day === todayKey;
              const hovered = hover?.cell.day === cell.day;
              return (
                <rect
                  key={cell.day}
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  rx={2.5}
                  fill={LEVEL_FILL[level(cell.answered)]}
                  stroke={hovered ? "#f2efea" : isToday ? "rgb(200 16 46 / 0.9)" : "none"}
                  strokeWidth={hovered || isToday ? 1.5 : 0}
                  onPointerEnter={() => setHover({ cell, x: x + CELL / 2, y })}
                />
              );
            })}
          </svg>
          {hover && (
            <div
              className={cn(
                "pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-line bg-ink-800 px-2.5 py-1.5 text-xs whitespace-nowrap shadow-xl",
                // The scroll box clips anything above the grid, so the top rows show their tooltip below the cell.
                hover.cell.row >= FLIP_BELOW_ROW && "-translate-y-full",
              )}
              style={{
                left: Math.min(Math.max(hover.x, 70), width - 70),
                top: hover.cell.row < FLIP_BELOW_ROW ? hover.y + CELL + 6 : hover.y - 6,
              }}
            >
              <span className="font-medium text-paper tabular-nums">
                {hover.cell.answered ? plural(hover.cell.answered, "answer") : "No study"}
              </span>
              {hover.cell.answered > 0 && (
                <span className="text-mist tabular-nums">
                  {" "}
                  · {Math.round((hover.cell.correct / hover.cell.answered) * 100)}% right
                </span>
              )}
              <span className="block text-[11px] text-smoke">{dateLabel(hover.cell.date)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-mist">
        <p className="tabular-nums">
          <span className="text-paper">{studiedDays}</span> {studiedDays === 1 ? "day" : "days"} studied ·{" "}
          <span className="text-paper">{best}</span>-day best streak ·{" "}
          <span className="text-paper">{yearAnswers.toLocaleString()}</span> {yearAnswers === 1 ? "answer" : "answers"} this year
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-smoke" aria-hidden>
          Less
          {LEVEL_FILL.map((fill, i) => (
            <span key={fill} title={LEVEL_LABEL[i]} className="size-[11px] rounded-[2.5px]" style={{ background: fill }} />
          ))}
          More
        </div>
      </div>
    </div>
  );
}
