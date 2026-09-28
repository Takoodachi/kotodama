/**
 * Furigana markup: `{漢字|かんじ}` puts かんじ above 漢字. Text outside braces is
 * rendered as-is. One string therefore gives the display text, the ruby and
 * the full kana reading.
 */
export interface RubySegment {
  text: string;
  ruby?: string;
}

const RUBY_PATTERN = /\{([^|{}]+)\|([^|{}]+)\}/g;

export function parseFurigana(source: string): RubySegment[] {
  const segments: RubySegment[] = [];
  let last = 0;
  for (const match of source.matchAll(RUBY_PATTERN)) {
    if (match.index > last) segments.push({ text: source.slice(last, match.index) });
    segments.push({ text: match[1], ruby: match[2] });
    last = match.index + match[0].length;
  }
  if (last < source.length) segments.push({ text: source.slice(last) });
  return segments;
}

/** Plain text as it is written, e.g. `{食|た}べる` → `食べる`. */
export function toSurface(source: string): string {
  return parseFurigana(source)
    .map((s) => s.text)
    .join("");
}

/** Full kana reading, e.g. `{食|た}べる` → `たべる`. */
export function toReading(source: string): string {
  return parseFurigana(source)
    .map((s) => s.ruby ?? s.text)
    .join("");
}

export function hasFurigana(source: string): boolean {
  return new RegExp(RUBY_PATTERN.source).test(source);
}

/** True when every brace in the string belongs to a valid `{text|ruby}` pair. */
export function isWellFormedFurigana(source: string): boolean {
  return !/[{}|]/.test(source.replace(RUBY_PATTERN, ""));
}
