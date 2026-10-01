// @ts-check
import {
  furiganaMarkup,
  japaneseKey,
  MATCHES,
  meaningWords,
  PHRASE_WORDS,
  plainMeaning,
} from "../../src/lib/jmdict/keys.mjs";

/**
 * Turns JMdict into the files the app's dictionary is served from. Nothing
 * here touches the disk or the network (see ../build-dictionary.mjs for
 * that), so the tests can build a small dictionary in memory.
 *
 * The files, all but the first under one folder named after what was built,
 * so a browser never mixes two builds and can keep what it has fetched:
 *
 *   meta.json            what was built, and the first key of each index file
 *   <v>/e/c<n>.json      entries, common ones first, a few dozen per file
 *   <v>/e/r<n>.json      the remaining (rarer) entries
 *   <v>/ja/<n>.json      Japanese index: how a word is written or read → entries
 *   <v>/en/<n>.json      English index: a word of a meaning → entries
 *   <v>/ph/<n>.json      English index: a whole meaning of a few words → entries
 *   <v>/sets/n<l>.json   JLPT word sets for the quiz
 *   <v>/links.json       the app's own words and phrases → their entries
 *
 * An entry is known by its position in commonness order (JLPT words from N5
 * up, then other common words, then the rest), which says which file holds it
 * and lets the indexes list the likeliest entries first.
 */

/** Bump when the shape of the files changes, so cached files of the old shape are dropped. */
export const FORMAT = 1;
/** Entries per file: common ones are longer and looked up far more often, so their files are smaller. */
export const COMMON_CHUNK = 32;
export const RARE_CHUNK = 128;
/** Rough size of one index file, before compression. */
const INDEX_BYTES = 48_000;

/**
 * @typedef {{ text: string, common: boolean, tags: string[], appliesToKanji?: string[] }} Form
 * @typedef {{
 *   partOfSpeech: string[], appliesToKanji: string[], appliesToKana: string[], field: string[],
 *   dialect: string[], misc: string[], info: string[], gloss: { text: string }[],
 * }} Sense
 * @typedef {{ id: string, kanji: Form[], kana: Form[], sense: Sense[] }} Word
 * @typedef {{ level: number, seq: number, kana: string, kanji: string, meaning: string[] }} JlptRow
 * @typedef {{ id: string, category: "vocab" | "phrase", surface: string, reading: string, meaning: string[] }} Curated
 * @typedef {{ level: number, parts: number }} SetConfig
 * @typedef {{ g: string[], p?: string[], m?: string[], i?: string[] }} CompactSense
 * @typedef {{ s: number, k?: string[], r: string[], e: CompactSense[], c?: 1, j?: number }} CompactEntry
 */

/** @param {Form} form */
const searchOnly = (form) => form.tags.includes("sK") || form.tags.includes("sk");
/** @param {Word} word */
const isCommon = (word) => word.kanji.some((k) => k.common) || word.kana.some((k) => k.common);
/** @param {Word} word */
const seqOf = (word) => Number(word.id);

/**
 * First value, then the difference to each next one: sorted numbers stay short.
 * @param {number[]} sorted
 */
function deltas(sorted) {
  return sorted.map((value, i) => (i === 0 ? value : value - sorted[i - 1]));
}

/**
 * The app's class of word for JMdict parts of speech; the first that maps wins.
 * @param {string[]} tags
 */
function partOfSpeech(tags) {
  for (const tag of tags) {
    if (tag === "adj-i" || tag === "adj-ix") return "i-adj";
    if (tag === "adj-na") return "na-adj";
    if (tag === "pn") return "pronoun";
    if (tag === "ctr") return "counter";
    if (tag === "adv" || tag === "adv-to") return "adverb";
    if (tag === "exp" || tag === "int" || tag === "conj") return "expression";
    if (/^v(1|5|k|z|s-|n|r)/.test(tag)) return "verb";
    if (tag === "n" || tag === "vs" || tag === "num" || tag === "adj-no" || tag.startsWith("n-")) return "noun";
  }
  return undefined;
}

/** Senses a learner shouldn't meet first: dated, crude or slang. */
const SIDE_SENSE = new Set(["arch", "obs", "rare", "dated", "hist", "vulg", "sl", "net-sl", "m-sl", "derog", "X"]);

/** @param {number} n */
const hash = (n) => Math.imul(n, 2654435761) >>> 0;

/**
 * A short fingerprint of some text (FNV-1a).
 * @param {string} text
 */
function fingerprint(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}

/**
 * Whether an entry's meanings share a word with the wanted ones, give or take
 * an ending ("grapes" and "grape").
 * @param {string[]} meaning
 * @param {Word} word
 */
function sharesWord(meaning, word) {
  const wanted = meaning.flatMap((m) => meaningWords(plainMeaning(m)));
  const has = new Set(word.sense.flatMap((sense) => sense.gloss.flatMap((g) => meaningWords(plainMeaning(g.text)))));
  return wanted.some(
    (w) => has.has(w) || (w.length >= 4 && [...has].some((h) => h.length >= 4 && (h.startsWith(w) || w.startsWith(h)))),
  );
}

/**
 * A JLPT word as the quiz needs it: [entry number, furigana markup, meanings, class of word].
 * @param {Word} word
 * @param {JlptRow} row
 */
function setWord(word, row) {
  const kana = word.kana.some((k) => k.text === row.kana) ? row.kana : word.kana[0].text;
  const kanji = word.kanji.some((k) => k.text === row.kanji) ? row.kanji : "";
  const senses = word.sense.filter(
    (sense) =>
      (sense.appliesToKana.includes("*") || sense.appliesToKana.includes(kana)) &&
      (!kanji || sense.appliesToKanji.includes("*") || sense.appliesToKanji.includes(kanji)),
  );
  const [first = word.sense[0], ...rest] = senses;
  // Words usually written in kana are taught that way.
  const written = kanji && !first.misc.includes("uk") ? kanji : kana;

  const meanings = first.gloss.slice(0, 3).map((g) => g.text);
  for (const sense of rest) {
    if (meanings.length >= 4) break;
    if (!sense.misc.some((m) => SIDE_SENSE.has(m))) meanings.push(sense.gloss[0].text);
  }
  const seen = new Set();
  const unique = meanings.filter((m) => {
    const plain = plainMeaning(m);
    return plain && !seen.has(plain) && seen.add(plain);
  });

  /** @type {(number | string | string[])[]} */
  const out = [seqOf(word), furiganaMarkup(written, kana), unique.length ? unique : meanings.slice(0, 1)];
  const pos = partOfSpeech(first.partOfSpeech);
  if (pos) out.push(pos);
  return out;
}

/**
 * @param {{ words: Word[], tags: Record<string, string>, date: string }} jmdict
 * @param {JlptRow[]} jlptRows
 * @param {Curated[]} curated
 * @param {SetConfig[]} setConfigs
 */
export function buildDictionary(jmdict, jlptRows, curated, setConfigs) {
  /** The files of the versioned folder, by their path inside it. @type {Map<string, unknown>} */
  const inside = new Map();

  /** @type {Map<number, Word>} */
  const bySeq = new Map(jmdict.words.map((word) => [seqOf(word), word]));
  /** @type {Map<string, Word[]>} */
  const byForm = new Map();
  for (const word of jmdict.words) {
    for (const key of new Set([...word.kanji, ...word.kana].map((form) => japaneseKey(form.text)))) {
      const list = byForm.get(key);
      if (list) list.push(word);
      else byForm.set(key, [word]);
    }
  }
  /**
   * Entries written and read a given way, common ones first.
   * @param {string} surface
   * @param {string} reading
   */
  const written = (surface, reading) => {
    const key = japaneseKey(reading);
    return (byForm.get(japaneseKey(surface)) ?? [])
      .filter((word) => word.kana.some((k) => japaneseKey(k.text) === key))
      .sort((a, b) => Number(isCommon(b)) - Number(isCommon(a)) || seqOf(a) - seqOf(b));
  };

  // ---- JLPT levels. A word listed at several levels counts at the easiest.
  // The lists name an entry by number. Where that is an uncommon entry meaning
  // something else than the list says (ボタン, "button", listed as the peony),
  // the common entry written the same way whose meaning does agree is taken.
  /** @type {Map<number, JlptRow>} */
  const jlpt = new Map();
  /** @type {string[]} */
  const relisted = [];
  for (const row of [...jlptRows].sort((a, b) => b.level - a.level)) {
    let word = bySeq.get(row.seq);
    if (!word || (!isCommon(word) && !sharesWord(row.meaning, word))) {
      const better = written(row.kanji || row.kana, row.kana).find((w) => isCommon(w) && sharesWord(row.meaning, w));
      if (better && better !== word) {
        relisted.push(`${row.kanji || row.kana} ${row.seq}→${better.id}`);
        word = better;
      }
    }
    if (word && !jlpt.has(seqOf(word))) jlpt.set(seqOf(word), { ...row, seq: seqOf(word) });
  }
  /** @param {Word} word */
  const levelOf = (word) => jlpt.get(seqOf(word))?.level ?? 0;

  // ---- Order: JLPT words from N5 up, then other common words, then the rest.
  /** @param {Word} word */
  const tier = (word) => (levelOf(word) ? 0 : isCommon(word) ? 1 : 2);
  const ordered = [...jmdict.words].sort(
    (a, b) => tier(a) - tier(b) || levelOf(b) - levelOf(a) || seqOf(a) - seqOf(b),
  );
  const firstRare = ordered.findIndex((word) => tier(word) === 2);
  const commonCount = firstRare < 0 ? ordered.length : firstRare;
  /** @type {Map<number, number>} */
  const position = new Map(ordered.map((word, at) => [seqOf(word), at]));

  // ---- Entries, and the two indexes.
  /** @type {Set<string>} */
  const usedTags = new Set();
  /** @type {Map<string, Set<number>>} */
  const japanese = new Map();
  /** @type {Map<string, Map<number, number>>} */
  const english = new Map();
  /** @type {Map<string, Map<number, number>>} */
  const phrases = new Map();
  /**
   * Lists an entry under a key, keeping its best match.
   * @param {Map<string, Map<number, number>>} index
   * @param {string} key
   * @param {number} at
   * @param {number} match
   */
  const list = (index, key, at, match) => {
    let postings = index.get(key);
    if (!postings) index.set(key, (postings = new Map()));
    const had = postings.get(at);
    if (had === undefined || match < had) postings.set(at, match);
  };

  const entries = ordered.map((word, at) => {
    for (const form of [...word.kanji, ...word.kana]) {
      const key = japaneseKey(form.text);
      if (!key) continue;
      const set = japanese.get(key);
      if (set) set.add(at);
      else japanese.set(key, new Set([at]));
    }

    const kanji = word.kanji.filter((k) => !searchOnly(k)).map((k) => k.text);
    const kana = word.kana.filter((k) => !searchOnly(k));
    // The reading shown first should be one that goes with the first written form.
    const main = kana.findIndex(
      (k) => !kanji.length || !k.appliesToKanji || k.appliesToKanji.includes("*") || k.appliesToKanji.includes(kanji[0]),
    );
    if (main > 0) kana.unshift(...kana.splice(main, 1));

    let lastPos = "";
    const senses = word.sense.map((sense, index) => {
      /** @type {CompactSense} */
      const out = { g: sense.gloss.map((g) => g.text) };
      // The part of speech is only repeated when it changes from one sense to the next.
      const pos = sense.partOfSpeech.join(",");
      if (pos !== lastPos) {
        out.p = sense.partOfSpeech;
        lastPos = pos;
      }
      const notes = [...sense.misc, ...sense.field, ...sense.dialect];
      if (notes.length) out.m = notes;
      if (sense.info.length) out.i = sense.info;
      for (const tag of [...sense.partOfSpeech, ...notes]) usedTags.add(tag);

      out.g.forEach((gloss, glossIndex) => {
        const plain = plainMeaning(gloss);
        const words = meaningWords(plain);
        // See MATCHES for what the numbers mean.
        const whole = index > 0 ? 2 : glossIndex > 0 ? 1 : 0;
        const single = words.length === 1 && words[0] === plain;
        for (const w of words) list(english, w, at, single ? whole : index > 0 ? 4 : 3);
        const length = plain.split(" ").length;
        if (length >= 2 && length <= PHRASE_WORDS) list(phrases, plain, at, whole);
      });
      return out;
    });

    /** @type {CompactEntry} */
    const entry = { s: seqOf(word), r: kana.map((k) => k.text), e: senses };
    if (kanji.length) entry.k = kanji;
    if (isCommon(word)) entry.c = 1;
    if (levelOf(word)) entry.j = levelOf(word);
    return entry;
  });

  for (let start = 0, n = 0; start < commonCount; start += COMMON_CHUNK, n++) {
    inside.set(`e/c${n}.json`, entries.slice(start, Math.min(start + COMMON_CHUNK, commonCount)));
  }
  for (let start = commonCount, n = 0; start < entries.length; start += RARE_CHUNK, n++) {
    inside.set(`e/r${n}.json`, entries.slice(start, start + RARE_CHUNK));
  }

  /**
   * Writes an index as files of sorted keys, and returns the first key of each
   * file: enough to tell which file holds any key.
   * @param {string} dir
   * @param {Map<string, number[]>} index key → sorted values
   */
  const writeIndex = (dir, index) => {
    const keys = [...index.keys()].sort();
    /** @type {string[]} */
    const firsts = [];
    /** @type {{ k: string[], p: number[][] }} */
    let chunk = { k: [], p: [] };
    let bytes = 0;
    const flush = () => {
      if (!chunk.k.length) return;
      inside.set(`${dir}/${firsts.length}.json`, chunk);
      firsts.push(chunk.k[0]);
      chunk = { k: [], p: [] };
      bytes = 0;
    };
    for (const key of keys) {
      const postings = deltas(/** @type {number[]} */ (index.get(key)));
      chunk.k.push(key);
      chunk.p.push(postings);
      bytes += key.length * 3 + 6 + postings.join(",").length;
      if (bytes >= INDEX_BYTES) flush();
    }
    flush();
    return firsts;
  };

  const ja = writeIndex(
    "ja",
    new Map([...japanese].map(([key, set]) => [key, [...set].sort((a, b) => a - b)])),
  );
  /** @param {Map<string, Map<number, number>>} index */
  const withMatches = (index) =>
    new Map(
      [...index].map(([key, postings]) => [
        key,
        [...postings].map(([at, match]) => at * MATCHES + match).sort((a, b) => a - b),
      ]),
    );
  const en = writeIndex("en", withMatches(english));
  const ph = writeIndex("ph", withMatches(phrases));

  // ---- The app's own words and phrases, matched to their entries.
  /**
   * The entry for something written and read a given way. Kanji and a reading
   * pin a word down; kana alone can be several words, so then the meaning has
   * to agree, or the entry has to be the only one normally written in kana.
   * @param {string} surface
   * @param {string} reading
   * @param {string[]} meaning
   */
  const entryFor = (surface, reading, meaning) => {
    const candidates = written(surface, reading).sort(
      (a, b) => /** @type {number} */ (position.get(seqOf(a))) - /** @type {number} */ (position.get(seqOf(b))),
    );
    if (japaneseKey(surface) !== japaneseKey(reading)) return candidates[0];
    const inKana = candidates.filter((word) => !word.kanji.length || word.sense[0].misc.includes("uk"));
    return candidates.find((word) => sharesWord(meaning, word)) ?? (inKana.length === 1 ? inKana[0] : undefined);
  };

  /** @type {Record<string, number>} */
  const links = {};
  /** @type {Map<number, string>} */
  const taught = new Map();
  /** @type {string[]} */
  const unlinked = [];
  for (const item of curated) {
    const exact = entryFor(item.surface, item.reading, item.meaning);
    // 勉強する is found under 勉強, お城 under 城.
    const found =
      exact ??
      (item.surface.endsWith("する") && item.reading.endsWith("する")
        ? entryFor(item.surface.slice(0, -2), item.reading.slice(0, -2), item.meaning)
        : undefined) ??
      (/^[おご]/.test(item.surface) && item.surface[0] === item.reading[0]
        ? entryFor(item.surface.slice(1), item.reading.slice(1), item.meaning)
        : undefined);
    if (!found) {
      unlinked.push(item.id);
      continue;
    }
    links[item.id] = seqOf(found);
    // A JLPT word the app already teaches is listed in its set by that id, not a second time.
    if (exact && item.category === "vocab" && !taught.has(seqOf(found))) taught.set(seqOf(found), item.id);
  }
  inside.set("links.json", links);

  // ---- JLPT word sets for the quiz, each level dealt into parts of a few hundred words.
  /** @type {Record<string, number>} */
  const setSizes = {};
  /** @type {Record<string, number>} */
  const setNewWords = {};
  let newWords = 0;
  /** @type {unknown[]} */
  const sets = [];
  for (const { level, parts } of setConfigs) {
    const rows = [...jlpt.values()]
      .filter((row) => row.level === level)
      .sort((a, b) => hash(a.seq) - hash(b.seq) || a.seq - b.seq)
      .map((row) => taught.get(row.seq) ?? setWord(/** @type {Word} */ (bySeq.get(row.seq)), row));
    /** @type {unknown[][]} */
    const groups = [];
    for (let part = 0; part < parts; part++) {
      const group = rows.slice(Math.round((rows.length * part) / parts), Math.round((rows.length * (part + 1)) / parts));
      groups.push(group);
      const id = `dict-n${level}-${part + 1}`;
      setSizes[id] = group.length;
      setNewWords[id] = group.filter((row) => typeof row !== "string").length;
      newWords += setNewWords[id];
    }
    inside.set(`sets/n${level}.json`, { level, groups });
    sets.push(groups);
  }

  // The folder is named after the JMdict release and the shape of the files,
  // and after the word sets and links too: those also change with the app's
  // own library, and a browser keeps a folder's files for good.
  const version = `${jmdict.date.replace(/-/g, "")}-${FORMAT}-${fingerprint(JSON.stringify([sets, links]))}`;
  /** @type {Map<string, unknown>} */
  const files = new Map([...inside].map(([path, content]) => [`${version}/${path}`, content]));

  files.set("meta.json", {
    version,
    date: jmdict.date,
    entries: entries.length,
    common: commonCount,
    chunk: [COMMON_CHUNK, RARE_CHUNK],
    ja,
    en,
    ph,
    sets: setSizes,
    setNewWords,
    newWords,
    tags: Object.fromEntries([...usedTags].sort().map((tag) => [tag, jmdict.tags[tag] ?? tag])),
  });

  return {
    version,
    files,
    report: {
      entries: entries.length,
      common: commonCount,
      jlpt: jlpt.size,
      japaneseKeys: japanese.size,
      englishWords: english.size,
      englishPhrases: phrases.size,
      linked: Object.keys(links).length,
      newWords,
      sets: setSizes,
      relisted,
      unlinked,
    },
  };
}
