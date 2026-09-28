# Kotodama 言霊

A dark, minimal Japanese practice app that runs on the web and installs as a PWA. Pick any mix of
hiragana and katakana rows, kanji levels, words, phrases and sentences, then drill them with
multiple choice, reading or typing quizzes. Spaced repetition brings back whatever you miss.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit + content-integrity tests (Vitest)
npm run build && npm start   # production build (service worker is active only here)
```

To install on a phone, open the production site over HTTPS. On Android, use **Install app**. On
iOS Safari, use **Share → Add to Home Screen**.

## Deployment (GitHub Pages)

[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) runs the tests, builds a
static export and publishes it to **https://takoodachi.github.io/kotodama/**. It runs on every push
to `main` or `feat/kotodama-app`, and can also be started by hand.

Setting `PAGES_BASE_PATH` (the workflow does this) switches `next.config.ts` to
`output: "export"` under that sub-path. Without it, the app builds for `next start` and sends its
security and service-worker headers. To try the Pages build locally, run
`PAGES_BASE_PATH=/kotodama npm run build` and serve `out/` under `/kotodama/`.

## How it's built

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript**, **Tailwind CSS v4**
- **motion** (Framer Motion) for transitions and answer feedback
- **zustand** with `persist` for settings and SRS progress in `localStorage`
- **wanakana** for romaji ↔ kana, spelling-tolerant answer checking, and the built-in kana converter
- **PWA:** `src/app/manifest.ts`, plus a hand-written `public/sw.js` registered in production.
  `next-pwa` is unmaintained and needs webpack, so it isn't used.

```
src/
├─ app/                 routes: / (home), /practice (picker), /quiz, /settings, manifest
├─ components/
│  ├─ selection/        Tofugu-style picker: sections, group chips, mode/direction/length, start bar
│  ├─ quiz/             QuizRunner, PromptCard, MultipleChoice, AnswerInput, FeedbackPanel, summary
│  ├─ japanese/         JpText (furigana ruby), SpeakButton
│  ├─ layout/ ui/ pwa/ home/ settings/
├─ data/                the content library
│  ├─ kana.ts           hiragana/katakana row tables (with accepted romaji variants)
│  ├─ kanji.json        N5 (103) + N4–N1 samples, with on/kun readings, JLPT level and school grade
│  ├─ vocab.json  phrases.json  sentences.json
│  ├─ groups.ts         sections and selectable sets that drive the picker, plus presets
│  └─ library.ts        resolves everything into StudyItems and indexes them
├─ lib/
│  ├─ quiz/             directions, distractors, look-alike clusters, answer checking, session building
│  ├─ srs.ts            Leitner boxes 0–5, review scheduling and priority weighting
│  ├─ furigana.ts       `{漢字|かんじ}` markup → ruby segments / surface text / reading
│  └─ japanese.ts       romaji/kana/English normalization
├─ store/               settings (persisted), progress (persisted SRS), session (in memory)
└─ hooks/               useHydrated, useSpeech, useHotkeys, useStartSession
```

## Adding content

Add entries to the JSON files in `src/data/`. Vocab, phrases and sentences mark furigana inline:

```json
{ "id": "v-taberu", "group": "vocab-verbs", "jp": "{食|た}べる", "meaning": ["to eat"], "pos": "verb", "jlpt": 5 }
```

The kana reading and romaji are derived from the markup. Phrases and sentences list their romaji
explicitly, so particles can be written as pronounced (は → wa). New group ids must also be added
to `src/data/groups.ts`. `npm test` checks every entry: unique ids, known groups, valid markup,
pure-kana readings, and romaji that matches the reading.
