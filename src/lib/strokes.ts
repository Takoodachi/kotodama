/**
 * Stroke order from KanjiVG (Ulrich Apel, CC BY-SA 3.0), one small SVG per
 * character, fetched from jsDelivr when first asked for. The release is
 * pinned, so a file never changes and the service worker keeps it for good.
 */
export const KANJIVG_FILES = "https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@r20260714/kanji/";

/** A character's strokes in the order they are written, on KanjiVG's 109 × 109 grid. */
export interface Strokes {
  /** Each stroke's SVG path. */
  paths: string[];
  /** Where each stroke's number sits. */
  numbers: { x: number; y: number }[];
}

export const strokeFile = (char: string) => `${KANJIVG_FILES}${char.codePointAt(0)!.toString(16).padStart(5, "0")}.svg`;

/** The strokes in a KanjiVG file: its paths come in writing order, then the numbers' positions. */
export function parseStrokes(svg: string): Strokes | null {
  const paths = [...svg.matchAll(/<path\b[^>]*?\sd="([^"]+)"/g)].map((match) => match[1]);
  const numbers = [...svg.matchAll(/matrix\(1 0 0 1 ([\d.]+) ([\d.]+)\)/g)].map((match) => ({ x: +match[1], y: +match[2] }));
  return paths.length ? { paths, numbers } : null;
}

const loaded = new Map<string, Promise<Strokes | null>>();

/** A character's strokes, or null when KanjiVG has none for it. Rejects when they can't be reached. */
export function loadStrokes(char: string): Promise<Strokes | null> {
  let strokes = loaded.get(char);
  if (!strokes) {
    strokes = fetch(strokeFile(char)).then(async (response) => {
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`KanjiVG ${response.status}`);
      return parseStrokes(await response.text());
    });
    // A failed fetch is tried again next time.
    strokes.catch(() => loaded.delete(char));
    loaded.set(char, strokes);
  }
  return strokes;
}
