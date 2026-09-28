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
  className?: string;
}

/** Japanese text with optional furigana, in the user's chosen glyph style. */
export function JpText({ text, ruby = "show", className }: JpTextProps) {
  const segments = parseFurigana(text);
  return (
    <span lang="ja" className={cn("jp", className)}>
      {segments.map((segment, i) =>
        segment.ruby && ruby !== "none" ? (
          <ruby key={i}>
            {segment.text}
            <rt className={cn("transition-opacity duration-500", ruby === "reserve" && "opacity-0")}>{segment.ruby}</rt>
          </ruby>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
    </span>
  );
}
