// @ts-check
/**
 * Builds the dictionary files under public/dict from JMdict.
 *
 *   npm run dict
 *
 * JMdict (https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project)
 * and KANJIDIC2 (https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) are
 * downloaded as JSON from the latest jmdict-simplified release and kept in
 * .cache/, so later runs are offline until a newer release appears. Set
 * JMDICT_JSON or KANJIDIC_JSON to a JSON file to build from that instead.
 * The JLPT levels of words come from scripts/jlpt/*.csv. Neither the
 * downloads nor the output are committed: the deploy workflow runs this
 * before each build.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { buildDictionary } from "./dictionary/build.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, ".cache", "jmdict");
const OUT = join(ROOT, "public", "dict");
const RELEASES = "https://api.github.com/repos/scriptin/jmdict-simplified/releases/latest";

/** @param {string} path */
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

/** The one file inside a .tgz, as text. */
/** @param {Buffer} archive */
function untar(archive) {
  const tar = gunzipSync(archive);
  for (let at = 0; at + 512 <= tar.length; ) {
    const name = tar.subarray(at, at + 100).toString("utf8").replace(/\0.*$/, "");
    if (!name) break;
    const size = parseInt(tar.subarray(at + 124, at + 136).toString("ascii"), 8);
    const type = String.fromCharCode(tar[at + 156]);
    if ((type === "0" || type === "\0") && name.endsWith(".json")) {
      return tar.subarray(at + 512, at + 512 + size).toString("utf8");
    }
    at += 512 + Math.ceil(size / 512) * 512;
  }
  throw new Error("No JSON file in the archive");
}

/** @type {Record<string, string>} */
const HEADERS = { "User-Agent": "kotodama-build", Accept: "application/vnd.github+json" };
if (process.env.GITHUB_TOKEN) HEADERS.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

/** @type {Promise<{ name: string, size: number, browser_download_url: string }[]> | undefined} */
let release;

/** The files of the latest release, asked for once. */
function releaseAssets() {
  release ??= fetch(RELEASES, { headers: HEADERS }).then(async (response) => {
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
    return (await response.json()).assets;
  });
  return release;
}

/**
 * One of the release's files as text: from the cache, or downloaded into it.
 * @param {string} name "jmdict-eng" or "kanjidic2-en"
 */
async function latest(name) {
  const archive = new RegExp(`^${name}-\\d.*\\.json\\.tgz$`);
  mkdirSync(CACHE, { recursive: true });
  const cached = () => readdirSync(CACHE).filter((file) => archive.test(file)).sort();
  let asset;
  try {
    asset = (await releaseAssets()).find((a) => archive.test(a.name));
    if (!asset) throw new Error(`the release has no ${name} archive`);
  } catch (error) {
    // Offline, or rate limited: a copy from an earlier run will do.
    const last = cached().at(-1);
    if (!last) throw new Error(`Couldn't find the latest ${name} (${error}), and none is cached.`);
    console.warn(`Couldn't check for a newer ${name} (${error}); using the cached ${last}.`);
    return untar(readFileSync(join(CACHE, last)));
  }

  const file = join(CACHE, asset.name);
  if (!existsSync(file)) {
    console.log(`Downloading ${asset.name} (${(asset.size / 1e6).toFixed(1)} MB)`);
    const response = await fetch(asset.browser_download_url, { headers: { "User-Agent": HEADERS["User-Agent"] } });
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    for (const old of cached()) if (old !== asset.name) rmSync(join(CACHE, old));
  }
  return untar(readFileSync(file));
}

/**
 * One line of a CSV file as its fields; quoted fields may hold commas.
 * @param {string} line
 */
function csvFields(line) {
  const fields = [];
  for (const match of line.matchAll(/(?:^|,)(?:"((?:[^"]|"")*)"|([^,]*))/g)) {
    fields.push(match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2]);
  }
  return fields;
}

/** scripts/jlpt/n5.csv … n1.csv: jmdict_seq,kana,kanji,waller_definition. */
function jlptRows() {
  const rows = [];
  for (const level of [5, 4, 3, 2, 1]) {
    const lines = readFileSync(join(ROOT, "scripts", "jlpt", `n${level}.csv`), "utf8").split(/\r?\n/).slice(1);
    for (const line of lines) {
      const [seq, kana, kanji = "", definition = ""] = csvFields(line);
      // A few rows name no entry; the build looks those up by how they are written.
      if (!kana) continue;
      const meaning = definition.split(/[,;]/).map((m) => m.trim()).filter(Boolean);
      rows.push({ level, seq: Number(seq) || 0, kana, kanji, meaning });
    }
  }
  return rows;
}

/** The app's own words and phrases, with the furigana markup taken apart. */
function curatedItems() {
  const ruby = /\{([^|{}]+)\|([^|{}]+)\}/g;
  return /** @type {const} */ (["vocab", "phrase"]).flatMap((category) =>
    readJson(join(ROOT, "src", "data", category === "vocab" ? "vocab.json" : "phrases.json")).map(
      (/** @type {{ id: string, jp: string, reading?: string, meaning: string[] }} */ raw) => ({
        id: raw.id,
        category,
        surface: raw.jp.replace(ruby, "$1"),
        reading: raw.reading ?? raw.jp.replace(ruby, "$2"),
        meaning: raw.meaning,
      }),
    ),
  );
}

/** The app's own kanji: which ones they are, and the level and grade they are filed under. */
function curatedKanji() {
  return readJson(join(ROOT, "src", "data", "kanji.json")).map(
    (/** @type {{ jp: string, jlpt: number, grade: number }} */ raw) => ({ literal: raw.jp, jlpt: raw.jlpt, grade: raw.grade }),
  );
}

/**
 * @param {string | undefined} file a JSON file to use instead of the release's
 * @param {string} name
 */
const source = async (file, name) => JSON.parse(file ? readFileSync(file, "utf8") : await latest(name));

const jmdict = await source(process.env.JMDICT_JSON, "jmdict-eng");
if (!String(jmdict.version).startsWith("3.") || !Array.isArray(jmdict.words)) {
  throw new Error(`Unexpected JMdict format (version ${jmdict.version}); scripts/dictionary/build.mjs needs a look.`);
}
const kanjidic = await source(process.env.KANJIDIC_JSON, "kanjidic2-en");
if (!String(kanjidic.version).startsWith("3.") || !Array.isArray(kanjidic.characters)) {
  throw new Error(`Unexpected KANJIDIC2 format (version ${kanjidic.version}); scripts/dictionary/kanji.mjs needs a look.`);
}

const { version, files, report } = buildDictionary(
  { words: jmdict.words, tags: jmdict.tags, date: jmdict.dictDate },
  jlptRows(),
  curatedItems(),
  readJson(join(ROOT, "src", "data", "dictionary-sets.json")),
  {
    characters: kanjidic.characters,
    curated: curatedKanji(),
    config: readJson(join(ROOT, "src", "data", "kanji-sets.json")),
  },
);

rmSync(OUT, { recursive: true, force: true });
let bytes = 0;
for (const [path, content] of files) {
  const file = join(OUT, path);
  mkdirSync(dirname(file), { recursive: true });
  const text = JSON.stringify(content);
  bytes += Buffer.byteLength(text);
  writeFileSync(file, text);
}

const { unlinked, relisted, sets, ...counts } = report;
console.log(`Dictionary ${version}: ${files.size} files, ${(bytes / 1e6).toFixed(1)} MB`);
console.log(counts);
console.log("Sets:", Object.entries(sets).map(([id, size]) => `${id.replace(/^dict-|^kanji-/, "")} ${size}`).join(", "));
console.log(`${relisted.length} JLPT words moved to the entry their meaning fits: ${relisted.join(", ")}`);
// Whole sentences among the phrases aren't dictionary entries, so most of these are expected.
const words = unlinked.filter((id) => id.startsWith("v-"));
console.log(`No entry for ${unlinked.length} of the app's own items (${words.length} words: ${words.join(" ")})`);
