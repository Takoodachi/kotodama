"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { gradeLabel, loadKanji } from "@/lib/jmdict/kanji";
import type { KanjiDetails as Details } from "@/lib/jmdict/types";

/** Details of some kanji, fetched when first shown: null while on their way, "failed" if they can't be reached. */
export function useKanjiDetails(kanji: readonly string[], wanted = true): Map<string, Details> | null | "failed" {
  const key = kanji.join("");
  const [loaded, setLoaded] = useState<{ key: string; details: Map<string, Details> | "failed" } | null>(null);

  useEffect(() => {
    if (!wanted || !key) return;
    let stale = false;
    loadKanji([...key]).then(
      (details) => !stale && setLoaded({ key, details }),
      () => !stale && setLoaded({ key, details: "failed" }),
    );
    return () => {
      stale = true;
    };
  }, [key, wanted]);

  return loaded?.key === key ? loaded.details : null;
}

function Tag({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] tracking-wide",
        gold ? "border-gold/40 text-gold-bright" : "border-line text-smoke",
      )}
    >
      {children}
    </span>
  );
}

/** A kun'yomi with the part written in kana after the kanji set apart: た.べる is た + べる. */
function Kun({ reading }: { reading: string }) {
  const [stem, okurigana] = reading.split(".");
  return (
    <span className="whitespace-nowrap">
      {stem}
      {okurigana && <span className="text-mist">{okurigana}</span>}
    </span>
  );
}

function Readings({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="flex gap-2 text-sm leading-relaxed">
      <span className="w-8 shrink-0 pt-0.5 text-[11px] tracking-wide text-smoke">{label}</span>
      <span lang="ja" className="jp flex min-w-0 flex-wrap gap-x-3 text-paper">
        {children}
      </span>
    </p>
  );
}

/** One kanji: what it means, how it's read, and where it stands (strokes, grade, JLPT level, how common). */
export function KanjiCard({ kanji, details, className }: { kanji: string; details?: Details; className?: string }) {
  return (
    <div className={cn("flex gap-4 rounded-xl border border-line bg-veil/[0.02] p-3.5", className)}>
      <span lang="ja" className="jp text-5xl leading-none text-paper">
        {kanji}
      </span>
      {details ? (
        <div className="min-w-0 flex-1 space-y-1.5">
          {details.m && <p className="text-sm leading-relaxed text-paper">{details.m.join(", ")}</p>}
          {details.o && (
            <Readings label="On">
              {details.o.map((reading) => (
                <span key={reading}>{reading}</span>
              ))}
            </Readings>
          )}
          {details.k && (
            <Readings label="Kun">
              {details.k.map((reading) => (
                <Kun key={reading} reading={reading} />
              ))}
            </Readings>
          )}
          <p className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {details.j && <Tag gold>JLPT N{details.j}</Tag>}
            {details.g && <Tag>{gradeLabel(details.g)}</Tag>}
            {details.s && <Tag>{details.s === 1 ? "1 stroke" : `${details.s} strokes`}</Tag>}
            {details.f && <Tag>No. {details.f.toLocaleString("en")} in newspapers</Tag>}
          </p>
        </div>
      ) : (
        <p className="self-center text-xs text-mist">No details for this character.</p>
      )}
    </div>
  );
}

/** Cards for some kanji, with their states while fetching. */
export function KanjiCards({ kanji, className }: { kanji: readonly string[]; className?: string }) {
  const details = useKanjiDetails(kanji);
  if (details === null) {
    return (
      <p className={cn("text-xs text-mist", className)} role="status">
        Fetching kanji…
      </p>
    );
  }
  if (details === "failed") {
    return (
      <p className={cn("text-xs text-mist", className)} role="status">
        The kanji details couldn&apos;t be reached.
      </p>
    );
  }
  return (
    <div className={cn("space-y-2", className)}>
      {kanji.map((ch) => (
        <KanjiCard key={ch} kanji={ch} details={details.get(ch)} />
      ))}
    </div>
  );
}
