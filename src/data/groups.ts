import { HIRAGANA_ROWS, KATAKANA_ROWS, type KanaRow } from "./kana";
import type { KanaKind } from "./types";

/** One selectable set: a chip in the picker. */
export interface GroupDef {
  id: string;
  /** Large label, usually Japanese. */
  label: string;
  /** Small label under it. */
  sublabel: string;
}

export interface SubsectionDef {
  id: string;
  title: string;
  /** Kanji only: which grouping scheme this subsection belongs to. */
  variant?: "jlpt" | "grade";
  groups: GroupDef[];
}

export type SectionId = "hiragana" | "katakana" | "kanji" | "vocab" | "phrase" | "sentence" | "grammar";

export interface SectionDef {
  id: SectionId;
  title: string;
  jpTitle: string;
  blurb: string;
  subsections: SubsectionDef[];
}

const KANA_SUBSECTIONS: { kind: KanaKind; title: string }[] = [
  { kind: "main", title: "Main" },
  { kind: "dakuten", title: "Dakuten ゛" },
  { kind: "handakuten", title: "Handakuten ゜" },
  { kind: "combo", title: "Combination" },
  { kind: "extended", title: "Extended (loanword sounds)" },
];

function kanaSubsections(prefix: string, rows: KanaRow[]): SubsectionDef[] {
  return KANA_SUBSECTIONS.map(({ kind, title }) => ({
    id: `${prefix}-${kind}`,
    title,
    groups: rows
      .filter((row) => row.kind === kind)
      .map((row) => ({ id: row.id, label: row.label, sublabel: row.sublabel })),
  })).filter((sub) => sub.groups.length > 0);
}

const JLPT_GROUPS: GroupDef[] = [5, 4, 3, 2, 1].map((level) => ({
  id: `kanji-n${level}`,
  label: `N${level}`,
  sublabel: ["", "Advanced", "Upper", "Intermediate", "Elementary", "Beginner"][level],
}));

const GRADE_GROUPS: GroupDef[] = [
  ...[1, 2, 3, 4, 5, 6].map((grade) => ({
    id: `kanji-g${grade}`,
    label: `${grade}年`,
    sublabel: `Grade ${grade}`,
  })),
  { id: "kanji-g8", label: "中学", sublabel: "Secondary" },
];

export const SECTIONS: SectionDef[] = [
  {
    id: "hiragana",
    title: "Hiragana",
    jpTitle: "ひらがな",
    blurb: "The native phonetic script: particles, endings and everyday words.",
    subsections: kanaSubsections("hira", HIRAGANA_ROWS),
  },
  {
    id: "katakana",
    title: "Katakana",
    jpTitle: "カタカナ",
    blurb: "The angular script for loanwords, names and emphasis.",
    subsections: kanaSubsections("kata", KATAKANA_ROWS),
  },
  {
    id: "kanji",
    title: "Kanji",
    jpTitle: "漢字",
    blurb: "Characters with meanings and readings, by JLPT level or school grade.",
    subsections: [
      { id: "kanji-jlpt", title: "JLPT level", variant: "jlpt", groups: JLPT_GROUPS },
      { id: "kanji-grade", title: "School grade", variant: "grade", groups: GRADE_GROUPS },
    ],
  },
  {
    id: "vocab",
    title: "Words",
    jpTitle: "単語",
    blurb: "Core vocabulary by theme.",
    subsections: [
      {
        id: "vocab-themes",
        title: "Themes",
        groups: [
          { id: "vocab-people", label: "人", sublabel: "People" },
          { id: "vocab-time", label: "時", sublabel: "Time & seasons" },
          { id: "vocab-food", label: "食", sublabel: "Food & drink" },
          { id: "vocab-places", label: "所", sublabel: "Places" },
          { id: "vocab-things", label: "物", sublabel: "Things" },
          { id: "vocab-nature", label: "自然", sublabel: "Nature & animals" },
          { id: "vocab-verbs", label: "動詞", sublabel: "Verbs" },
          { id: "vocab-adjectives", label: "形容詞", sublabel: "Adjectives" },
          { id: "vocab-numbers", label: "数", sublabel: "Numbers & counters" },
          { id: "vocab-loanwords", label: "外来語", sublabel: "Loanwords" },
          { id: "vocab-body", label: "体", sublabel: "Body" },
          { id: "vocab-town", label: "町", sublabel: "Town & transport" },
          { id: "vocab-school", label: "学", sublabel: "School & work" },
          { id: "vocab-home", label: "住", sublabel: "Home" },
          { id: "vocab-adverbs", label: "副詞", sublabel: "Adverbs & questions" },
          { id: "vocab-hobbies", label: "趣味", sublabel: "Hobbies & feelings" },
        ],
      },
    ],
  },
  {
    id: "phrase",
    title: "Phrases",
    jpTitle: "表現",
    blurb: "Set expressions you'll hear and use every day.",
    subsections: [
      {
        id: "phrase-situations",
        title: "Situations",
        groups: [
          { id: "phrase-greetings", label: "挨拶", sublabel: "Greetings" },
          { id: "phrase-courtesy", label: "礼儀", sublabel: "Courtesy" },
          { id: "phrase-travel", label: "旅行", sublabel: "Travel" },
          { id: "phrase-dining", label: "食事", sublabel: "Dining" },
          { id: "phrase-daily", label: "日常", sublabel: "Daily life" },
          { id: "phrase-shopping", label: "買物", sublabel: "Shopping" },
          { id: "phrase-feelings", label: "気持", sublabel: "Feelings" },
          { id: "phrase-smalltalk", label: "会話", sublabel: "Small talk" },
          { id: "phrase-classroom", label: "教室", sublabel: "Classroom" },
          { id: "phrase-emergency", label: "緊急", sublabel: "Emergencies" },
        ],
      },
    ],
  },
  {
    id: "sentence",
    title: "Sentences",
    jpTitle: "文",
    blurb: "Full sentences grouped by grammar pattern.",
    subsections: [
      {
        id: "sentence-grammar",
        title: "Grammar patterns",
        groups: [
          { id: "sent-desu", label: "です", sublabel: "A は B です" },
          { id: "sent-masu", label: "ます", sublabel: "Polite verbs" },
          { id: "sent-past", label: "ました", sublabel: "Past tense" },
          { id: "sent-adj", label: "い・な", sublabel: "Adjectives" },
          { id: "sent-exist", label: "ある・いる", sublabel: "Existence" },
          { id: "sent-te", label: "て", sublabel: "Te-form" },
          { id: "sent-tai", label: "たい", sublabel: "Wants & desires" },
          { id: "sent-n4", label: "N4", sublabel: "N4 patterns" },
          { id: "sent-invite", label: "ませんか", sublabel: "Invitations" },
          { id: "sent-compare", label: "より", sublabel: "Comparisons" },
          { id: "sent-reason", label: "から", sublabel: "Reasons & contrast" },
          { id: "sent-time", label: "前・後", sublabel: "Time & order" },
          { id: "sent-cond", label: "たら", sublabel: "Conditionals" },
          { id: "sent-n4b", label: "N4+", sublabel: "More N4 patterns" },
        ],
      },
    ],
  },
  {
    id: "grammar",
    title: "Grammar",
    jpTitle: "文法",
    blurb: "Fill in the missing particle, ending or word. Each answer comes with a short explanation.",
    subsections: [
      {
        id: "grammar-particles",
        title: "Particles",
        groups: [
          { id: "gram-wa-ga", label: "は・が", sublabel: "Topic & subject" },
          { id: "gram-wo-ni", label: "を・に", sublabel: "Objects & targets" },
          { id: "gram-de-to", label: "で・と", sublabel: "Place, means & with" },
          { id: "gram-mo-no", label: "も・の・や", sublabel: "Also, of & lists" },
          { id: "gram-kara-made", label: "から・まで", sublabel: "From, until & than" },
          { id: "gram-ka-ne-yo", label: "か・ね・よ", sublabel: "Sentence endings" },
        ],
      },
      {
        id: "grammar-forms",
        title: "Verb & adjective forms",
        groups: [
          { id: "gram-masu", label: "ます", sublabel: "Polite tenses" },
          { id: "gram-te", label: "て", sublabel: "Te-form" },
          { id: "gram-nai", label: "ない", sublabel: "Negatives & must" },
          { id: "gram-adj", label: "い・な", sublabel: "Adjective forms" },
        ],
      },
      {
        id: "grammar-patterns",
        title: "Patterns",
        groups: [
          { id: "gram-tai", label: "たい", sublabel: "Wanting" },
          { id: "gram-permission", label: "てもいい", sublabel: "Permission & rules" },
          { id: "gram-experience", label: "たことがある", sublabel: "Experience & advice" },
          { id: "gram-giving", label: "あげる", sublabel: "Giving & receiving" },
          { id: "gram-cond", label: "たら・ば", sublabel: "If & when" },
          { id: "gram-looks", label: "そう", sublabel: "Looks & seems" },
        ],
      },
    ],
  },
];

export const ALL_GROUPS: GroupDef[] = SECTIONS.flatMap((s) => s.subsections.flatMap((sub) => sub.groups));

export const GROUPS_BY_ID = new Map(ALL_GROUPS.map((g) => [g.id, g]));

export function groupIdsOfSection(section: SectionDef, variant?: "jlpt" | "grade"): string[] {
  return section.subsections
    .filter((sub) => !sub.variant || !variant || sub.variant === variant)
    .flatMap((sub) => sub.groups.map((g) => g.id));
}

export interface Preset {
  id: string;
  label: string;
  groups: () => string[];
}

const sectionById = (id: SectionId) => SECTIONS.find((s) => s.id === id)!;
const kanaOfKind = (rows: KanaRow[], kinds: KanaKind[]) =>
  rows.filter((r) => kinds.includes(r.kind)).map((r) => r.id);

export const PRESETS: Preset[] = [
  { id: "all-hiragana", label: "All hiragana", groups: () => groupIdsOfSection(sectionById("hiragana")) },
  { id: "all-katakana", label: "All katakana", groups: () => groupIdsOfSection(sectionById("katakana")) },
  {
    id: "kana-basics",
    label: "Kana basics",
    groups: () => [...kanaOfKind(HIRAGANA_ROWS, ["main"]), ...kanaOfKind(KATAKANA_ROWS, ["main"])],
  },
  {
    id: "n5-starter",
    label: "N5 starter",
    groups: () => ["kanji-n5", "vocab-people", "vocab-time", "vocab-food", "phrase-greetings", "sent-desu"],
  },
  {
    id: "particles",
    label: "Particles",
    groups: () => SECTIONS.find((s) => s.id === "grammar")!.subsections[0].groups.map((g) => g.id),
  },
  {
    id: "traveller",
    label: "Traveller",
    groups: () => ["phrase-greetings", "phrase-courtesy", "phrase-travel", "phrase-dining", "vocab-places", "vocab-loanwords"],
  },
];
