"use client";

import { motion } from "motion/react";
import { useState } from "react";

export interface RadarDatum {
  key: string;
  label: string;
  jp: string;
  /** 0–1 */
  value: number;
  /** Shown in the tooltip, e.g. "86 of 190 known". */
  detail: string;
}

const R = 100;
const LABEL_R = R + 26;
const RINGS = [0.25, 0.5, 0.75, 1];
const VIEW = { x: -175, y: -150, w: 350, h: 300 };

function point(index: number, count: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

/**
 * One series of proficiency across categories. Every axis is labelled
 * directly with its value, and the same numbers sit in a visually hidden table.
 */
export function RadarChart({ data, title }: { data: RadarDatum[]; title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const n = data.length;
  const polygon = data.map((d, i) => point(i, n, Math.max(d.value, 0.02) * R).join(",")).join(" ");
  const current = active !== null ? data[active] : null;
  const currentPoint = active !== null ? point(active, n, Math.max(data[active].value, 0.02) * R) : null;

  return (
    <figure className="relative">
      <svg
        viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`${title}: ${data.map((d) => `${d.label} ${Math.round(d.value * 100)}%`).join(", ")}`}
        onPointerLeave={() => setActive(null)}
      >
        {/* Recessive grid: rings at 25% steps and spokes. */}
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={data.map((_, i) => point(i, n, ring * R).join(",")).join(" ")}
            fill="none"
            stroke="var(--chart-grid)"
            strokeWidth={1}
          />
        ))}
        {data.map((d, i) => {
          const [x, y] = point(i, n, R);
          return <line key={d.key} x1={0} y1={0} x2={x} y2={y} stroke="var(--chart-grid)" strokeWidth={1} />;
        })}
        <text x={3} y={-R * 0.5 - 3} className="fill-smoke text-[8px]">50%</text>
        <text x={3} y={-R - 3} className="fill-smoke text-[8px]">100%</text>

        <motion.polygon
          points={polygon}
          fill="rgb(201 164 92 / 0.16)"
          stroke="var(--heat-4)"
          strokeWidth={2}
          strokeLinejoin="round"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />

        {data.map((d, i) => {
          const [x, y] = point(i, n, Math.max(d.value, 0.02) * R);
          const [lx, ly] = point(i, n, LABEL_R);
          const anchor = Math.abs(lx) < 5 ? "middle" : lx > 0 ? "start" : "end";
          const hovered = active === i;
          return (
            <g key={d.key}>
              <text x={lx} y={ly - 4} textAnchor={anchor} className="fill-paper text-[11px]">
                {d.label}
              </text>
              <text x={lx} y={ly + 10} textAnchor={anchor} className="fill-mist text-[10px] tabular-nums">
                {Math.round(d.value * 100)}%
              </text>
              {/* Marker, with a 24px transparent hit area around it. */}
              <circle cx={x} cy={y} r={hovered ? 5.5 : 4} fill="var(--heat-4)" stroke="var(--color-ink-900)" strokeWidth={2} />
              <circle
                cx={x}
                cy={y}
                r={12}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${d.label}: ${Math.round(d.value * 100)}%, ${d.detail}`}
                className="cursor-pointer outline-none focus-visible:stroke-gold"
                strokeWidth={1.5}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              />
            </g>
          );
        })}
      </svg>

      {current && currentPoint && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-lg border border-line bg-ink-800 px-2.5 py-1.5 text-xs whitespace-nowrap shadow-xl"
          style={{
            left: `${((currentPoint[0] - VIEW.x) / VIEW.w) * 100}%`,
            top: `${((currentPoint[1] - VIEW.y) / VIEW.h) * 100}%`,
          }}
        >
          <span className="font-medium text-paper tabular-nums">{Math.round(current.value * 100)}%</span>
          <span className="text-mist"> · {current.label}</span>
          <span className="block text-[11px] text-smoke">{current.detail}</span>
        </div>
      )}

      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.label}</th>
              <td>{Math.round(d.value * 100)}%</td>
              <td>{d.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
