import { KANA_CHARTS, type KanaCell, type KanaChartRow, type KanaScript } from "@/data/kanaChart";
import { cn } from "@/lib/cn";

export const SCRIPT_NAMES: Record<KanaScript, { jp: string; en: string }> = {
  hiragana: { jp: "ひらがな", en: "Hiragana" },
  katakana: { jp: "カタカナ", en: "Katakana" },
};

/** Five sounds under their vowels, a gap, then the three combinations with ゃ ゅ ょ, which are two kana wide. */
const ROW = "grid grid-cols-[repeat(5,minmax(0,1fr))_0.3fr_repeat(3,minmax(0,1.3fr))]";

function Cell({ cell, roomy }: { cell: KanaCell | null; roomy?: boolean }) {
  if (!cell) return <span />;
  return (
    <span className="flex flex-col items-center py-0.5 whitespace-nowrap">
      <span lang="ja" className={cn("jp leading-none text-paper", roomy ? "text-lg" : "text-base")}>
        {cell.kana}
      </span>
      <span className={cn("mt-0.5 leading-none text-mist", roomy ? "text-[11px]" : "text-[10px]")}>{cell.romaji}</span>
    </span>
  );
}

function Rows({ rows, roomy }: { rows: KanaChartRow[]; roomy?: boolean }) {
  return rows.map((row) => (
    <div key={row.main.find((cell) => cell)?.kana} className={cn(ROW, roomy && "py-0.5")}>
      {row.main.map((cell, column) => (
        <Cell key={column} cell={cell} roomy={roomy} />
      ))}
      <span />
      {row.combo.map((cell) => (
        <Cell key={cell.kana} cell={cell} roomy={roomy} />
      ))}
    </div>
  ));
}

interface KanaChartProps {
  script: KanaScript;
  /** Larger, for where the chart has the screen to itself. */
  roomy?: boolean;
  className?: string;
}

/**
 * One script's kana with their romaji, to look things up in: a row for each
 * consonant, its combinations with ゃ ゅ ょ beside it, the voiced rows below,
 * and for katakana the extra sounds loanwords use.
 */
export function KanaChart({ script, roomy, className }: KanaChartProps) {
  const chart = KANA_CHARTS[script];
  const name = SCRIPT_NAMES[script];
  return (
    <section aria-label={`${name.en} chart`} className={className}>
      <h2 className="eyebrow mb-2">
        <span lang="ja">{name.jp}</span> · {name.en}
      </h2>
      <Rows rows={chart.basic} roomy={roomy} />
      <div className="mt-1.5 border-t border-line pt-1.5">
        <Rows rows={chart.voiced} roomy={roomy} />
      </div>
      {chart.extended.length > 0 && (
        <div className="mt-1.5 border-t border-line pt-1.5">
          <h3 className="mb-1 text-[10px] tracking-wide text-smoke">For loanwords</h3>
          <div className={cn("grid grid-cols-6", roomy && "gap-y-1")}>
            {chart.extended.map((cell) => (
              <Cell key={cell.kana} cell={cell} roomy={roomy} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
