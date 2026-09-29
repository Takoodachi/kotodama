"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { japaneseVoices, speakJapanese, speechSupported } from "@/lib/speech";
import { useSettings } from "@/store/settings";

const NO_VOICES: SpeechSynthesisVoice[] = [];
let cachedVoices: SpeechSynthesisVoice[] = NO_VOICES;

function subscribe(onChange: () => void) {
  if (!speechSupported()) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
}

/** Returns the same array instance until the voice list actually changes. */
function voicesSnapshot(): SpeechSynthesisVoice[] {
  const voices = japaneseVoices();
  const changed = voices.length !== cachedVoices.length || voices.some((v, i) => v !== cachedVoices[i]);
  if (changed) cachedVoices = voices.length ? voices : NO_VOICES;
  return cachedVoices;
}

export function useJapaneseVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore(subscribe, voicesSnapshot, () => NO_VOICES);
}

const supportedSnapshot = () => speechSupported();

export function useSpeech() {
  const { rate, voiceURI } = useSettings((s) => s.audio);
  const supported = useSyncExternalStore(subscribe, supportedSnapshot, () => false);
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback(
    (text: string, onDone?: () => void) =>
      speakJapanese(text, {
        rate,
        voiceURI,
        onStart: () => setSpeaking(true),
        onEnd: () => {
          setSpeaking(false);
          onDone?.();
        },
      }),
    [rate, voiceURI],
  );

  return { supported, speaking, speak };
}
