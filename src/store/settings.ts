import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_DIRECTIONS, type Direction, type Mode } from "@/lib/quiz/directions";
import { ALL_SCRIPTS, type Script } from "@/lib/writing";

export type FuriganaMode = "show" | "after" | "hide";
export type GlyphStyle = "sans" | "mincho";
export type Autoplay = "off" | "answer" | "reveal";
/** Number of questions; 0 means endless. */
export type SessionLength = 10 | 20 | 30 | 50 | 0;

export interface AudioSettings {
  autoplay: Autoplay;
  rate: number;
  voiceURI: string | null;
}

interface SettingsState {
  selected: string[];
  mode: Mode;
  directions: Record<Mode, Direction[]>;
  sessionLength: SessionLength;
  kanjiGrouping: "jlpt" | "grade";
  furigana: FuriganaMode;
  glyph: GlyphStyle;
  audio: AudioSettings;
  builtInIme: boolean;
  autoAdvance: boolean;
  /** Scripts words, phrases and sentences are written in. */
  writing: Script[];
  /** Whether the practice guide has been shown (it opens by itself on the first visit). */
  guideSeen: boolean;

  toggleGroup: (id: string) => void;
  setGroups: (ids: string[], on: boolean) => void;
  setSelection: (ids: string[]) => void;
  setMode: (mode: Mode) => void;
  toggleDirection: (mode: Mode, direction: Direction) => void;
  setSessionLength: (length: SessionLength) => void;
  setKanjiGrouping: (grouping: "jlpt" | "grade") => void;
  setFurigana: (mode: FuriganaMode) => void;
  setGlyph: (glyph: GlyphStyle) => void;
  setAudio: (audio: Partial<AudioSettings>) => void;
  setBuiltInIme: (on: boolean) => void;
  setAutoAdvance: (on: boolean) => void;
  toggleWriting: (script: Script) => void;
  setGuideSeen: (seen: boolean) => void;
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
      audio: { autoplay: "answer", rate: 0.9, voiceURI: null },
      builtInIme: false,
      autoAdvance: true,
      writing: ALL_SCRIPTS,
      guideSeen: false,

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
