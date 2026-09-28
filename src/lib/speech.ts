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

export function bestVoice(voices: SpeechSynthesisVoice[], preferredURI: string | null): SpeechSynthesisVoice | undefined {
  if (preferredURI) {
    const chosen = voices.find((v) => v.voiceURI === preferredURI);
    if (chosen) return chosen;
  }
  for (const pattern of PREFERRED_VOICES) {
    const match = voices.find((v) => pattern.test(v.name));
    if (match) return match;
  }
  return voices[0];
}

export interface SpeakOptions {
  rate: number;
  voiceURI: string | null;
  onStart?: () => void;
  onEnd?: () => void;
}

export function speakJapanese(text: string, { rate, voiceURI, onStart, onEnd }: SpeakOptions): void {
  if (!speechSupported() || !text) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = rate;
  const voice = bestVoice(japaneseVoices(), voiceURI);
  if (voice) utterance.voice = voice;
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  synth.speak(utterance);
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}
