"use client";

import { RotateCcw } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { loadStrokes, type Strokes } from "@/lib/strokes";

/** Seconds from one stroke to the next. */
const STEP = 0.55;

/**
 * A kanji written out stroke by stroke, numbered, with a button to watch it
 * again. With reduced motion, every stroke is simply there.
 */
export function StrokeOrder({ kanji }: { kanji: string }) {
  const [loaded, setLoaded] = useState<{ kanji: string; strokes: Strokes | null | "failed" } | null>(null);
  // Bumped to draw the strokes again from the first.
  const [run, setRun] = useState(0);
  const still = useReducedMotion();

  useEffect(() => {
    let stale = false;
    loadStrokes(kanji).then(
      (strokes) => !stale && setLoaded({ kanji, strokes }),
      () => !stale && setLoaded({ kanji, strokes: "failed" }),
    );
    return () => {
      stale = true;
    };
  }, [kanji]);

  const strokes = loaded?.kanji === kanji ? loaded.strokes : undefined;
  if (!strokes || strokes === "failed") {
    return (
      <p className="text-xs text-mist" role="status">
        {strokes === undefined
          ? "Fetching the strokes…"
          : strokes === "failed"
            ? "The stroke order couldn't be reached: it needs a connection the first time."
            : "There's no stroke order for this character."}
      </p>
    );
  }

  return (
    <div className="flex items-end gap-3">
      <svg
        key={run}
        viewBox="0 0 109 109"
        role="img"
        aria-label={`${kanji} is written in ${strokes.paths.length === 1 ? "1 stroke" : `${strokes.paths.length} strokes`}`}
        className="size-32 shrink-0 rounded-lg border border-line bg-veil/[0.02]"
      >
        <path d="M54.5 4V105M4 54.5H105" fill="none" strokeWidth={0.6} strokeDasharray="2 3" className="stroke-veil/15" />
        <g fill="none" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" className="stroke-paper">
          {strokes.paths.map((d, i) => (
            <path
              key={i}
              d={d}
              pathLength={1}
              style={
                still
                  ? undefined
                  : { strokeDasharray: 1, strokeDashoffset: 1, animation: `draw-stroke ${STEP * 0.85}s ease-out ${i * STEP}s forwards` }
              }
            />
          ))}
        </g>
        <g aria-hidden className="fill-smoke">
          {strokes.numbers.map((at, i) => (
            <text key={i} x={at.x} y={at.y} fontSize={8}>
              {i + 1}
            </text>
          ))}
        </g>
      </svg>
      {!still && (
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className="flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-mist transition-colors hover:border-veil/25 hover:text-paper"
        >
          <RotateCcw className="size-3.5" strokeWidth={1.75} />
          Again
        </button>
      )}
    </div>
  );
}
