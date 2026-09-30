import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_DIRECTIONS, type Direction, type Mode, type PracticeMode } from "@/lib/quiz/directions";
import { stopSpeaking } from "@/lib/speech";
import { ALL_SCRIPTS, type Script } from "@/lib/writing";

export type FuriganaMode = "show" | "after" | "hide";
export type GlyphStyle = "sans" | "mincho";
export type Autoplay = "off" | "answer" | "reveal";
/** Number of questions; 0 means endless. */
export type SessionLength = 10 | 20 | 30 | 50 | 0;
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

  toggleGroup: (id: string) => void;
  setGroups: (ids: string[], on: boolean) => void;
  setSelection: (ids: string[]) => void;
  setMode: (mode: PracticeMode) => void;
  toggleDirection: (mode: Mode, direction: Direction) => void;
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
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
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
      setSessionLength: (sessionLength) => set({ sessionLength }),
      setKanjiGrouping: (kanjiGrouping) => set({ kanjiGrouping }),
      setFurigana: (furigana) => set({ furigana }),
      setGlyph: (glyph) => set({ glyph }),
      setJpSize: (jpSize) => set({ jpSize }),
      setAudio: (audio) => set((s) => ({ audio: { ...s.audio, ...audio } })),
      setBuiltInIme: (builtInIme) => set({ builtInIme }),
      setAutoAdvance: (autoAdvance) => set({ autoAdvance }),
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
    }),
    {
      name: "kotodama-settings",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Rehydrated by <StoreHydrator /> after mount so server and client render the same HTML.
      skipHydration: true,
    },
  ),
);
