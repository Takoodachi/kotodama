import { parseFurigana } from "@/lib/furigana";
import { cn } from "@/lib/cn";

/**
 * - `show`: ruby visible
 * - `reserve`: ruby laid out but invisible, so revealing it later doesn't shift the text
 * - `none`: plain text, no ruby at all
 */
export type RubyDisplay = "show" | "reserve" | "none";

interface JpTextProps {
  text: string;
  ruby?: RubyDisplay;
  /** Marks the first occurrence of this text (compared on the plain surface). */
  highlight?: string;
  className?: string;
}

/** Japanese text with optional furigana, in the user's chosen glyph style. */
export function JpText({ text, ruby = "show", highlight, className }: JpTextProps) {
  const segments = parseFurigana(text);
  const surface = segments.map((s) => s.text).join("");
  const start = highlight ? surface.indexOf(highlight) : -1;
  const end = start >= 0 ? start + highlight!.length : -1;
  // Where each segment starts in the plain surface text.
  const offsets = segments.reduce<number[]>((acc, s, i) => [...acc, i ? acc[i - 1] + segments[i - 1].text.length : 0], []);

  return (
    <span lang="ja" className={cn("jp", className)}>
      {segments.map((segment, i) => {
        const from = offsets[i];
        const to = from + segment.text.length;
        const marked = start >= 0 && from < end && to > start;
        const node =
          segment.ruby && ruby !== "none" ? (
            <ruby key={i}>
              {segment.text}
              <rt className={cn("transition-opacity duration-500", ruby === "reserve" && "opacity-0")}>
                {segment.ruby}
              </rt>
            </ruby>
          ) : (
            <span key={i}>{segment.text}</span>
          );
        // Ruby segments are highlighted whole; plain segments only on the matched characters.
        if (!marked) return node;
        if (segment.ruby) return <mark key={i} className="bg-transparent text-gold-bright">{node}</mark>;
        const a = Math.max(start - from, 0);
        const b = Math.min(end - from, segment.text.length);
        return (
          <span key={i}>
            {segment.text.slice(0, a)}
            <mark className="bg-transparent text-gold-bright">{segment.text.slice(a, b)}</mark>
            {segment.text.slice(b)}
          </span>
        );
      })}
    </span>
  );
}
