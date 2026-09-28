/**
 * Japanese text-to-speech through the Web Speech API. Voice lists load
 * asynchronously (Chrome fires `voiceschanged`), and which voices exist
 * depends on the OS, so the best one is chosen from what is there.
 */

/** Natural-sounding voices first, by platform. */
const PREFERRED_VOICES = [/google.*日本語/i, /kyoko/i, /o-ren/i, /nanami/i, /haruka/i, /ayumi/i, /sayaka/i, /otoya/i, /ichiro/i];

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function japaneseVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith("ja"));
}

/**
 * Picks a voice: the user's choice if it exists, otherwise the most natural
 * one available. Network voices (like Chrome's "Google 日本語") don't work
 * offline, so without a connection only on-device voices are considered.
 */
export function bestVoice(
  voices: SpeechSynthesisVoice[],
  preferredURI: string | null,
  { localOnly = false } = {},
): SpeechSynthesisVoice | undefined {
  const usable = localOnly ? voices.filter((v) => v.localService) : voices;
  if (preferredURI) {
    const chosen = usable.find((v) => v.voiceURI === preferredURI);
    if (chosen) return chosen;
  }
  for (const pattern of PREFERRED_VOICES) {
    const match = usable.find((v) => pattern.test(v.name));
    if (match) return match;
  }
  return usable[0];
}

export interface SpeakOptions {
  rate: number;
  voiceURI: string | null;
  onStart?: () => void;
  onEnd?: () => void;
}

// Chrome can garbage-collect an utterance mid-sentence (so `onend` never
// fires) unless something holds a reference to it.
let current: SpeechSynthesisUtterance | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | undefined;

function utter(text: string, voice: SpeechSynthesisVoice | undefined, options: SpeakOptions, allowRetry: boolean) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = options.rate;
  if (voice) utterance.voice = voice;
  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => {
    if (current === utterance) current = null;
    options.onEnd?.();
  };
  utterance.onerror = (event) => {
    if (current === utterance) current = null;
    // A network voice that fails (offline, flaky connection) gets one retry on an on-device voice.
    const fallback = bestVoice(japaneseVoices(), null, { localOnly: true });
    if (allowRetry && voice && !voice.localService && fallback && event.error !== "interrupted" && event.error !== "canceled") {
      utter(text, fallback, options, false);
      return;
    }
    options.onEnd?.();
  };
  current = utterance;
  window.speechSynthesis.speak(utterance);
}

export function speakJapanese(text: string, options: SpeakOptions): void {
  if (!speechSupported() || !text) return;
  const synth = window.speechSynthesis;
  const voice = bestVoice(japaneseVoices(), options.voiceURI, { localOnly: !navigator.onLine });
  clearTimeout(pendingTimer);
  if (synth.paused) synth.resume();
  if (synth.speaking || synth.pending) {
    // Chrome sometimes drops an utterance queued in the same tick as cancel().
    synth.cancel();
    pendingTimer = setTimeout(() => utter(text, voice, options, true), 80);
  } else {
    utter(text, voice, options, true);
  }
}

export function stopSpeaking(): void {
  clearTimeout(pendingTimer);
  if (speechSupported()) window.speechSynthesis.cancel();
}
