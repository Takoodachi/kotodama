# Kotodama 言霊

A dark, minimal Japanese practice app that runs on the web and installs as a PWA. Pick any mix of
hiragana and katakana rows, kanji levels, words, phrases and sentences, then drill them with
multiple choice, reading or typing quizzes. Spaced repetition brings back whatever you miss.

- **Dictionary:** the whole of [JMdict](https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project)
  (about 219,000 entries), opened from the Practice page. Search in English, Japanese or romaji.
  It is fetched a few small files at a time, so it needs a connection for words not looked up
  before; see [The dictionary](#the-dictionary).
- **JLPT word sets:** every JLPT level's word list (about 7,700 words, N5 to N1), drawn from the
  dictionary and dealt into sets of a couple of hundred. A level's words are fetched when one of
  its sets is first chosen, and work offline after that.
- **Unlocking:** a word, phrase or sentence is unlocked the first time you answer it right. During
  a quiz, the book button opens your own dictionary: only what you've unlocked, and never the card
  you're on. It starts empty and fills up as you learn. "My library" on the dictionary page lists
  everything there is to unlock.
- **All at once:** Tofugu-style: every selected kana, kanji and word on one page. Type what you
  know, press Enter to check, retry wrong ones, then Finish to see what you missed.
- **Grammar:** 127 fill-in-the-gap drills in 16 sets (particles, verb and adjective forms, common
  patterns), each with a hand-picked set of wrong options and a short explanation.
- **Light and dark themes** (Settings → Theme, or Auto to follow the device), and a **mute**
  button on every screen.
- **Typing mode** (typing Japanese with an IME) is offered on phones and tablets only.
- **Practice guide:** a four-step walkthrough opens on the first visit, then lives behind the
  **ⓘ Guide** button in the header.
- **Written in:** choose whether words, phrases and sentences appear in hiragana, katakana,
  kanji or any mix (hiragana + katakana keeps loanwords in katakana, with no kanji). A preview
  shows the result, and prompts, options and example sentences all follow it.
- **Example sentences:** every word and kanji comes with a short sentence using it, with the word
  highlighted. Tap the sentence to hear it and see the translation. The first time you meet a
  word, its sentence always shows.
- **Ghost mode:** one tap drills the 20 items you have the lowest accuracy on.
- **Study heatmap:** the home page shows a year of daily study, GitHub-style.
- **Progress page:** a radar of known share per category, plus mastery bars for every set
  (N5 kanji, each kana group, each word theme…).
- **Accounts:** sign in (Settings → Account) to keep progress in sync across devices. Practice on
  several devices adds up, even offline; see [Accounts and sync](#accounts-and-sync).
- **Look back:** "Previous card" (or `←`) shows earlier cards in a session and plays them again.
- **Keyboard:** `1`–`4` answer, `Enter` or `Space` continue, `←` look back, `Esc` ends the session.
- **Kept safe:** once there is progress, the app asks the browser to keep its storage for good.
  Browsers otherwise clear a site's data when space runs low, and Safari after a week without a
  visit unless the app is installed; Settings says so when the browser hasn't agreed and no
  account holds a copy.
- **Offline:** after one visit, every page, the content library and the Japanese font slices it
  needs are cached. Audio uses the device's speech voices; when offline, the app picks an on-device voice.
  The full dictionary is the exception: only what has been looked up or practiced before is kept.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run dict       # downloads JMdict and builds the dictionary files (once; see "The dictionary")
npm test           # unit + content-integrity tests (Vitest)
npm run build && npm start   # production build (service worker is active only here)
```

To install on a phone, open the production site over HTTPS. On Android, use **Install app**. On
iOS Safari, use **Share → Add to Home Screen**.

## Deployment (GitHub Pages)

[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) runs the tests, builds
the dictionary files and a static export, and publishes it to
**https://takoodachi.github.io/kotodama/**. It runs on every push to `main`, on the 1st of each
month (to refresh the dictionary), and can also be started by hand.

Setting `PAGES_BASE_PATH` (the workflow does this) switches `next.config.ts` to
`output: "export"` under that sub-path. Without it, the app builds for `next start` and sends its
security and service-worker headers. To try the Pages build locally, run
`PAGES_BASE_PATH=/kotodama npm run build` and serve `out/` under `/kotodama/`.

## The dictionary

The dictionary is [JMdict](https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project),
the property of the [Electronic Dictionary Research and Development Group](https://www.edrdg.org/),
used under the group's [licence](https://www.edrdg.org/edrdg/licence.html) (CC BY-SA 4.0). JLPT
levels follow [Jonathan Waller's lists](https://www.tanos.co.uk/jlpt/), matched to JMdict entries by
[yomitan-jlpt-vocab](https://github.com/stephenmk/yomitan-jlpt-vocab) (CC BY-SA 4.0); those lists
are kept in [`scripts/jlpt`](scripts/jlpt). The files built from them carry the same licence.

`npm run dict` ([`scripts/build-dictionary.mjs`](scripts/build-dictionary.mjs)) downloads the latest
JMdict as JSON from [jmdict-simplified](https://github.com/scriptin/jmdict-simplified) into `.cache/`
and writes about 54 MB of small files to `public/dict/`. Neither folder is committed: the deploy
workflow runs the script before each build, and once a month on a schedule, which keeps the data
within the month's freshness the licence asks for. Without the files the app still works; the
dictionary page says it can't be reached and the JLPT sets stay empty.

Nothing downloads the dictionary whole. The files are:

- `meta.json`: what was built, and the first key of every index file.
- Three sorted indexes, cut into files of about 48 KB: how a word is written or read, each word of
  a meaning, and whole meanings of a few words ("ice cream"). A search reads the one or two files
  that cover what was typed ([`src/lib/jmdict/search.ts`](src/lib/jmdict/search.ts)).
- The entries, most common first, 32 to a file for common words and 128 for the rest. Showing a
  page of results reads the files those entries are in.
- One file per JLPT level with its words for the quiz, and the links from the app's own words to
  their entries. A quiz word's meanings are the dictionary's, tidied for a card: the sense the JLPT
  list has in mind leads when the dictionary's first sense is about something else (肉 is "meat"
  before "flesh"), and long notes in parentheses are dropped ("cup", not "cup (drinking vessel,
  measure, …)").

The service worker keeps every dictionary file it has fetched, so earlier lookups and used word
sets work offline. The files sit in a folder named after the JMdict release and the word sets built from it; when a new one is
deployed, the old folder's files are dropped.

## Accounts and sync

Accounts use [Supabase](https://supabase.com) (free tier) for email + password sign-in and one
table. Without the two environment variables below, the app works as before and keeps progress
on the device only.

1. **Table:** run [`supabase/migrations/20260929000000_kotodama_progress.sql`](supabase/migrations/20260929000000_kotodama_progress.sql)
   in Supabase → SQL Editor. It only adds `kotodama_progress`, so it can share a project with
   other apps (accounts are then shared too).
2. **Keys:** in GitHub → Settings → Secrets and variables → Actions, add the secrets
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase → Project Settings →
   API). For local development, copy `.env.example` to `.env.local` and fill it in.
3. **Email links:** in Supabase → Authentication → URL Configuration, add
   `https://takoodachi.github.io/kotodama/**` (and `http://localhost:3000/**` for development) to
   the Redirect URLs, so confirmation and password-reset emails lead back to the app.

How syncing works ([`src/lib/sync`](src/lib/sync)): each account has one progress document. A
device pulls it, merges its own progress in and saves the result: 15 seconds after answering, right
away when the app is put away, and it pulls again when the app comes back into view or online.
The merge keeps the latest answer per item, keeps each device's answer counts apart (so practice
on two devices adds up instead of overwriting), and carries streaks across devices. A save only
succeeds if nobody saved since it read; otherwise it merges again. Resetting progress while signed
in resets it on every device; signing out clears it from that device.

## How it's built

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript**, **Tailwind CSS v4**
- **motion** (Framer Motion) for transitions and answer feedback
- **zustand** with `persist` for settings and SRS progress in `localStorage`
- **Supabase** (optional) for accounts and cross-device sync, loaded only when used
- **wanakana** for romaji ↔ kana, spelling-tolerant answer checking, and the built-in kana converter
- **PWA:** `src/app/manifest.ts`, plus a hand-written `public/sw.js` registered in production.
  `next-pwa` is unmaintained and needs webpack, so it isn't used.

```
src/
├─ app/                 routes: / (home), /practice (picker), /practice/dictionary, /quiz, /all,
│                       /progress, /settings, manifest
├─ components/
│  ├─ selection/        Tofugu-style picker: sections, group chips, mode/direction/length, start bar
│  ├─ quiz/             QuizRunner, PromptCard, MultipleChoice, AnswerInput, FeedbackPanel, summary
│  ├─ japanese/         JpText (furigana ruby, highlighting), ExampleSentence, SpeakButton
│  ├─ stats/            StudyHeatmap, RadarChart, MasteryBar, ProgressScreen
│  ├─ dictionary/       the dictionary page (JMdict search, own library), the in-quiz dictionary
│  ├─ account/          sign-in panel, sync status, background sync
│  ├─ layout/ ui/ pwa/ home/ practice/ settings/
├─ data/                the content library
│  ├─ kana.ts           hiragana/katakana row tables (with accepted romaji variants)
│  ├─ kanji.json        524 kanji (N5 103, N4 143, N3 167, N2 57, N1 54) with readings, JLPT level, grade
│  ├─ vocab.json  phrases.json  sentences.json
│  ├─ examples.json     an example sentence for every word and kanji
│  ├─ groups.ts         sections and selectable sets that drive the picker, plus presets
│  ├─ wordSets.ts       the JLPT word sets from the dictionary: ids, levels, parts
│  └─ library.ts        resolves everything into StudyItems and indexes them
├─ lib/
│  ├─ quiz/             directions, distractors, look-alike clusters, answer checking, session building
│  ├─ sync/             progress document, merge rules, Supabase client and sync
│  ├─ jmdict/           the full dictionary: search keys (shared with the build script), search, fetching
│  ├─ dictionary.ts     the learner's own dictionary: search over the library, what is unlocked
│  ├─ srs.ts            Leitner boxes 0–5, review scheduling and priority weighting
│  ├─ analytics.ts      learning states (new / learning / known / mastered), weakest items
│  ├─ furigana.ts       `{漢字|かんじ}` markup → ruby segments / surface text / reading
│  └─ japanese.ts       romaji/kana/English normalization
├─ store/               settings and progress (localStorage), live session (sessionStorage), account,
│                       fetched word sets
└─ hooks/               useHydrated, useSpeech, useHotkeys, useStartSession, useScrolled…
scripts/
├─ build-dictionary.mjs downloads JMdict, writes public/dict (see "The dictionary")
├─ dictionary/build.mjs turns JMdict into the indexes, entry files and JLPT sets
└─ jlpt/                JLPT word lists, n5.csv to n1.csv
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
