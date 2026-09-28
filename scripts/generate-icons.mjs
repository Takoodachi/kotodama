// Renders the app icons from one SVG definition: `npm run icons`.
// The mark is 言 ("word") built from rectangles, so it needs no font.
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const INK = "#0a0a0a";
const PAPER = "#f2efea";
const CRIMSON = "#c8102e";

/** @param {number} scale share of the canvas the glyph occupies (maskable icons need a safe zone). */
function iconSvg(scale, { rounded = false } = {}) {
  const offset = (100 - 100 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="glow" cx="50%" cy="38%" r="70%">
      <stop offset="0%" stop-color="#2a0a10"/>
      <stop offset="100%" stop-color="${INK}"/>
    </radialGradient>
  </defs>
  <rect width="100" height="100" rx="${rounded ? 22 : 0}" fill="url(#glow)"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <rect x="45" y="12" width="10" height="10" fill="${CRIMSON}"/>
    <g fill="${PAPER}">
      <rect x="16" y="28" width="68" height="6"/>
      <rect x="27" y="42" width="46" height="5"/>
      <rect x="27" y="54" width="46" height="5"/>
    </g>
    <rect x="29.5" y="68.5" width="41" height="21" fill="none" stroke="${PAPER}" stroke-width="5"/>
  </g>
</svg>`;
}

const outDir = new URL("../public/icons/", import.meta.url);
await mkdir(outDir, { recursive: true });

const targets = [
  { file: "icon-192.png", size: 192, svg: iconSvg(0.78) },
  { file: "icon-512.png", size: 512, svg: iconSvg(0.78) },
  { file: "maskable-512.png", size: 512, svg: iconSvg(0.6) },
  { file: "apple-touch-icon.png", size: 180, svg: iconSvg(0.72) },
];

for (const { file, size, svg } of targets) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(fileURLToPath(new URL(file, outDir)));
  console.log(`wrote public/icons/${file}`);
}

await writeFile(new URL("icon.svg", outDir), iconSvg(0.8, { rounded: true }));
console.log("wrote public/icons/icon.svg");
