import { describe, expect, it } from "vitest";
import { parseStrokes, strokeFile } from "./strokes";

// The start of KanjiVG's 人 (two strokes), as the file has it.
const PERSON = `<svg xmlns="http://www.w3.org/2000/svg" width="109" height="109" viewBox="0 0 109 109">
<g id="kvg:StrokePaths_04eba" style="fill:none;stroke:#000000;stroke-width:3;">
<g id="kvg:04eba" kvg:element="人" kvg:radical="general">
	<path id="kvg:04eba-s1" kvg:type="㇒" d="M54.5,20c0.37,2.12,0.23,4.03-0.22,6.27C51.68,39.48,38.25,72.25,16.5,87.25"/>
	<path id="kvg:04eba-s2" kvg:type="㇏" d="M49,50.75c5.75,8.12,21.37,25.62,32.37,33.5c3.66,2.62,7.06,3.48,11.13,4"/>
</g>
</g>
<g id="kvg:StrokeNumbers_04eba" style="font-size:8;fill:#808080">
	<text transform="matrix(1 0 0 1 46.50 18.50)">1</text>
	<text transform="matrix(1 0 0 1 56.50 51.50)">2</text>
</g>
</svg>`;

describe("KanjiVG stroke files", () => {
  it("reads the strokes in order, with where their numbers go", () => {
    const strokes = parseStrokes(PERSON)!;
    expect(strokes.paths).toHaveLength(2);
    expect(strokes.paths[0]).toMatch(/^M54\.5,20c/);
    expect(strokes.numbers).toEqual([
      { x: 46.5, y: 18.5 },
      { x: 56.5, y: 51.5 },
    ]);
    expect(parseStrokes("<svg></svg>")).toBeNull();
  });

  it("names a character's file by its code point", () => {
    expect(strokeFile("人")).toMatch(/\/kanji\/04eba\.svg$/);
    expect(strokeFile("食")).toMatch(/\/kanji\/098df\.svg$/);
    expect(strokeFile("𠮟")).toMatch(/\/kanji\/20b9f\.svg$/);
  });
});
