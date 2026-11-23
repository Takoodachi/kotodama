import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_DIRECTIONS, MODE_DIRECTIONS, type Direction, type Mode, type PracticeMode } from "@/lib/quiz/directions";
import { stopSpeaking } from "@/lib/speech";
import { mergeEntries, stamp } from "@/lib/sync/ownDoc";
import type { SettingsDoc } from "@/lib/sync/progressDoc";
import { ALL_SCRIPTS, type Script } from "@/lib/writing";

export type FuriganaMode = "show" | "after" | "hide";
export type GlyphStyle = "sans" | "mincho";
export type Autoplay = "off" | "answer" | "reveal";
/** Number of questions; 0 means endless. */
export type SessionLength = 10 | 20 | 30 | 50 | 0;

/** Answers a day to aim for; 0 is no goal. */
export const DAILY_GOALS = [0, 10, 20, 50, 100] as const;
export type DailyGoal = (typeof DAILY_GOALS)[number];
export type Theme = "dark" | "light" | "system";
/** How much larger Japanese study text is drawn than normal. */
export type JpSize = 1 | 1.15 | 1.3 | 1.5;
export const JP_SIZES: JpSize[] = [1, 1.15, 1.3, 1.5];

export interface AudioSettings {
  autoplay: Autoplay;
  rate: number;
  voiceURI: string | null;
}

interface SettingsState {
  selected: string[];
  mode: PracticeMode;
  directions: Record<Mode, Direction[]>;
  sessionLength: SessionLength;
  kanjiGrouping: "jlpt" | "grade";
  furigana: FuriganaMode;
  glyph: GlyphStyle;
  jpSize: JpSize;
  audio: AudioSettings;
  builtInIme: boolean;
  autoAdvance: boolean;
  /** Scripts words, phrases and sentences are written in. */
  writing: Script[];
  /** Whether the practice guide has been shown (it opens by itself on the first visit). */
  guideSeen: boolean;
  /** Silences every pronunciation, everywhere. */
  muted: boolean;
  theme: Theme;
  /** Whether the kana chart is shown beside the pages that have it, on screens with the room. */
  kanaChart: boolean;
  dailyGoal: DailyGoal;
  /** When each synced setting was last changed (see SYNCED), for merging with the account. */
  syncedAt: Partial<Record<SyncedSetting, number>>;

  toggleGroup: (id: string) => void;
  setGroups: (ids: string[], on: boolean) => void;
  setSelection: (ids: string[]) => void;
  setMode: (mode: PracticeMode) => void;
  toggleDirection: (mode: Mode, direction: Direction) => void;
  /** Reading mode answers one way: the reading ("jp-romaji"), the meaning ("jp-en") or both ("jp-both"). */
  setReadingAnswer: (direction: Direction) => void;
  setSessionLength: (length: SessionLength) => void;
  setKanjiGrouping: (grouping: "jlpt" | "grade") => void;
  setFurigana: (mode: FuriganaMode) => void;
  setGlyph: (glyph: GlyphStyle) => void;
  setJpSize: (size: JpSize) => void;
  setAudio: (audio: Partial<AudioSettings>) => void;
  setBuiltInIme: (on: boolean) => void;
  setAutoAdvance: (on: boolean) => void;
  toggleWriting: (script: Script) => void;
  setGuideSeen: (seen: boolean) => void;
  setMuted: (muted: boolean) => void;
  setTheme: (theme: Theme) => void;
  setKanaChart: (shown: boolean) => void;
  setDailyGoal: (goal: DailyGoal) => void;
  /** Takes in the settings from the account, or only the account's when this device's belong to another. */
  mergeSynced: (doc: SettingsDoc, replace?: boolean) => void;
}

const isOneOf =
  (...values: unknown[]) =>
  (value: unknown) =>
    values.includes(value);
const isBoolean = (value: unknown) => typeof value === "boolean";
const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every((v) => typeof v === "string");

/**
 * The settings that follow the learner to their other devices when signed in,
 * and what each may hold: what comes from the account is checked before it is
 * used. The rest (text size, voice, mute, the kana converter, the kana chart)
 * suit one device's screen, speakers or keyboard, and stay on it.
 */
const SYNCED = {
  selected: isStrings,
  mode: isOneOf("choice", "reading", "typing", "grid"),
  directions: (value: unknown) =>
    !!value &&
    typeof value === "object" &&
    (Object.keys(MODE_DIRECTIONS) as Mode[]).every((mode) => {
      const enabled = (value as Record<string, unknown>)[mode];
      return isStrings(enabled) && enabled.length > 0 && enabled.every((d) => MODE_DIRECTIONS[mode].includes(d as Direction));
    }),
  sessionLength: isOneOf(10, 20, 30, 50, 0),
  kanjiGrouping: isOneOf("jlpt", "grade"),
  furigana: isOneOf("show", "after", "hide"),
  glyph: isOneOf("sans", "mincho"),
  autoplay: isOneOf("off", "answer", "reveal"),
  rate: (value: unknown) => typeof value === "number" && value >= 0.5 && value <= 1.3,
  autoAdvance: isBoolean,
  writing: (value: unknown) => isStrings(value) && value.length > 0 && value.every((s) => ALL_SCRIPTS.includes(s as Script)),
  guideSeen: isBoolean,
  theme: isOneOf("dark", "light", "system"),
  dailyGoal: isOneOf(...DAILY_GOALS),
};
export type SyncedSetting = keyof typeof SYNCED;
const SYNCED_SETTINGS = Object.keys(SYNCED) as SyncedSetting[];

/** A synced setting's value; the audio ones live inside `audio`. */
function syncedValue(state: Partial<SettingsState>, name: SyncedSetting): unknown {
  return name === "autoplay" || name === "rate" ? state.audio?.[name] : state[name];
}

/** The synced settings changed on this device or taken from the account, as they go to the account. */
export function syncedSettings(state: SettingsState): SettingsDoc {
  const doc: SettingsDoc = {};
  for (const name of SYNCED_SETTINGS) {
    const at = state.syncedAt[name];
    if (at) doc[name] = { at, value: syncedValue(state, name) };
  }
  return doc;
}

/** True while the account's settings are being taken in, which is no change of this device's. */
let applyingSynced = false;

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      selected: ["hira-a", "hira-ka"],
      mode: "choice",
      directions: DEFAULT_DIRECTIONS,
      sessionLength: 20,
      kanjiGrouping: "jlpt",
      furigana: "show",
      glyph: "mincho",
      jpSize: 1,
      audio: { autoplay: "answer", rate: 0.9, voiceURI: null },
      builtInIme: false,
      autoAdvance: true,
      writing: ALL_SCRIPTS,
      guideSeen: false,
      muted: false,
      theme: "dark",
      kanaChart: true,
      dailyGoal: 20,
      syncedAt: {},

      toggleGroup: (id) =>
        set((s) => ({
          selected: s.selected.includes(id) ? s.selected.filter((g) => g !== id) : [...s.selected, id],
        })),
      setGroups: (ids, on) =>
        set((s) => ({
          selected: on ? [...new Set([...s.selected, ...ids])] : s.selected.filter((g) => !ids.includes(g)),
        })),
      setSelection: (ids) => set({ selected: [...new Set(ids)] }),
      setMode: (mode) => set({ mode }),
      toggleDirection: (mode, direction) =>
        set((s) => {
          const current = s.directions[mode];
          const next = current.includes(direction)
            ? current.filter((d) => d !== direction)
            : [...current, direction];
          // At least one direction must stay on.
          if (!next.length) return s;
          return { directions: { ...s.directions, [mode]: next } };
        }),
      setReadingAnswer: (direction) => set((s) => ({ directions: { ...s.directions, reading: [direction] } })),
      setSessionLength: (sessionLength) => set({ sessionLength }),
      setKanjiGrouping: (kanjiGrouping) => set({ kanjiGrouping }),
      setFurigana: (furigana) => set({ furigana }),
      setGlyph: (glyph) => set({ glyph }),
      setJpSize: (jpSize) => set({ jpSize }),
      setAudio: (audio) => set((s) => ({ audio: { ...s.audio, ...audio } })),
      setBuiltInIme: (builtInIme) => set({ builtInIme }),
      setAutoAdvance: (autoAdvance) => set({ autoAdvance }),
      setDailyGoal: (dailyGoal) => set({ dailyGoal }),
      mergeSynced: (doc, replace = false) => {
        const state = get();
        const merged = replace ? doc : mergeEntries(syncedSettings(state), doc);
        const changes: Record<string, unknown> = {};
        const audio: Record<string, unknown> = {};
        const syncedAt: SettingsState["syncedAt"] = replace ? {} : { ...state.syncedAt };
        for (const name of SYNCED_SETTINGS) {
          const entry = merged[name];
          // Missing, or not what this setting can hold: this device's stays.
          if (!entry || !SYNCED[name](entry.value)) continue;
          syncedAt[name] = entry.at;
          if (JSON.stringify(entry.value) === JSON.stringify(syncedValue(state, name))) continue;
          if (name === "autoplay" || name === "rate") audio[name] = entry.value;
          else changes[name] = entry.value;
        }
        applyingSynced = true;
        try {
          set({
            ...(changes as Partial<SettingsState>),
            ...(Object.keys(audio).length && { audio: { ...state.audio, ...audio } }),
            syncedAt,
          });
        } finally {
          applyingSynced = false;
        }
      },
      toggleWriting: (script) =>
        set((s) => {
          const next = s.writing.includes(script) ? s.writing.filter((w) => w !== script) : [...s.writing, script];
          // At least one script must stay on.
          return next.length ? { writing: next } : s;
        }),
      setGuideSeen: (guideSeen) => set({ guideSeen }),
      setMuted: (muted) => {
        // Muting also cuts off anything playing right now.
        if (muted) stopSpeaking();
        set({ muted });
      },
      setTheme: (theme) => set({ theme }),
      setKanaChart: (kanaChart) => set({ kanaChart }),
    }),
    {
      name: "kotodama-settings",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        const state = persisted as Partial<SettingsState>;
        // v2: reading mode answers one way at a time, and gained "both"; the old
        // mix of reading and meaning (each card one or the other) becomes both.
        if (version < 2 && state.directions) {
          const reading = state.directions.reading ?? [];
          state.directions = { ...state.directions, reading: reading.length === 1 ? reading : ["jp-both"] };
        }
        // v3 syncs settings. Those chosen before count as chosen long ago: they
        // pass to a device still on the defaults, but any change made since wins.
        if (version < 3) {
          const defaults = useSettings.getInitialState();
          state.syncedAt = Object.fromEntries(
            SYNCED_SETTINGS.filter((name) => {
              const value = syncedValue(state, name);
              return value !== undefined && JSON.stringify(value) !== JSON.stringify(syncedValue(defaults, name));
            }).map((name) => [name, 1]),
          );
        }
        return state as SettingsState;
      },
      // Rehydrated by <StoreHydrator /> after mount so server and client render the same HTML.
      skipHydration: true,
    },
  ),
);

// A synced setting changed here is stamped with the time, so the account keeps
// the latest change of it, from whichever device. Loading the saved settings isn't a change.
useSettings.subscribe((state, prev) => {
  if (applyingSynced || !useSettings.persist.hasHydrated()) return;
  const changed = SYNCED_SETTINGS.filter((name) => syncedValue(state, name) !== syncedValue(prev, name));
  if (!changed.length) return;
  const syncedAt = { ...state.syncedAt };
  for (const name of changed) syncedAt[name] = stamp({ at: syncedAt[name] ?? 0 });
  useSettings.setState({ syncedAt });
});
