"use client";

import { Play, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { AccountPanel } from "@/components/account/AccountPanel";
import { JpText } from "@/components/japanese/Furigana";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Toggle } from "@/components/ui/Toggle";
import { useHydrated } from "@/hooks/useHydrated";
import { useJapaneseVoices, useSpeech } from "@/hooks/useSpeech";
import { useAccount } from "@/store/account";
import { useProgress } from "@/store/progress";
import { useSettings } from "@/store/settings";

const SAMPLE = "{日本語|にほんご}を{勉強|べんきょう}しています。";

function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl p-5 sm:p-6">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1.5 mb-5 font-mincho text-2xl text-paper">{title}</h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-paper">{label}</p>
      {hint && <p className="mt-0.5 mb-3 text-xs leading-relaxed text-mist">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

/**
 * Two taps to erase: the first arms the button for a few seconds. Signed in,
 * it erases progress on every device; signed out, only on this one.
 */
function ResetProgress() {
  const [armed, setArmed] = useState(false);
  const count = useProgress((s) => Object.keys(s.records).length);
  const signedIn = useAccount((s) => s.status === "signed-in");
  const reset = useProgress((s) => (signedIn ? s.reset : s.clearLocal));

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <Button
      variant={armed ? "primary" : "ghost"}
      onClick={() => {
        if (!armed) return setArmed(true);
        reset();
        setArmed(false);
      }}
    >
      <Trash2 className="size-4" />
      {armed ? `Tap again to erase ${count} records${signedIn ? " everywhere" : ""}` : "Reset all progress"}
    </Button>
  );
}

export function SettingsScreen() {
  const hydrated = useHydrated();
  const settings = useSettings();
  const totals = useProgress((s) => s.totals);
  const account = useAccount((s) => s.status);
  const voices = useJapaneseVoices();
  const { supported, speak } = useSpeech();

  return (
    <motion.div
      initial={false}
      animate={{ opacity: hydrated ? 1 : 0 }}
      className="mx-auto w-full max-w-3xl space-y-5 px-4 pt-4 pb-10 md:px-8 md:pt-8"
    >
      <header className="mb-6">
        <p className="eyebrow">設定 · Settings</p>
        <h1 className="mt-2 font-mincho text-3xl text-paper md:text-5xl">Make it yours</h1>
      </header>

      <AccountPanel />

      <Panel eyebrow="Display" title="Reading aids">
        <Field label="Furigana" hint="Small kana over kanji in words, phrases and sentences.">
          <SegmentedControl
            label="Furigana"
            value={settings.furigana}
            onChange={settings.setFurigana}
            options={[
              { value: "show", label: "Always" },
              { value: "after", label: "After answering" },
              { value: "hide", label: "Never" },
            ]}
          />
          <p className="mt-4 rounded-xl border border-line px-4 py-3 text-center text-2xl text-paper">
            <JpText text={SAMPLE} ruby={settings.furigana === "hide" ? "none" : settings.furigana === "after" ? "reserve" : "show"} />
          </p>
        </Field>
        <Field label="Glyph style" hint="Mincho is brush-like and elegant; sans is plain and easy to read at small sizes.">
          <SegmentedControl
            label="Glyph style"
            value={settings.glyph}
            onChange={settings.setGlyph}
            options={[
              { value: "mincho", label: <span className="font-mincho text-base">明朝 Mincho</span> },
              { value: "sans", label: <span className="font-jp text-base">ゴシック Sans</span> },
            ]}
          />
        </Field>
      </Panel>

      <Panel eyebrow="Audio" title="Pronunciation">
        {!supported ? (
          <p className="text-sm text-mist">This browser doesn&apos;t support speech synthesis.</p>
        ) : (
          <>
            <Field label="Play automatically">
              <SegmentedControl
                label="Play automatically"
                value={settings.audio.autoplay}
                onChange={(autoplay) => settings.setAudio({ autoplay })}
                options={[
                  { value: "off", label: "Off" },
                  { value: "answer", label: "After answering" },
                  { value: "reveal", label: "On reveal" },
                ]}
              />
              <p className="mt-2 text-xs leading-relaxed text-smoke">
                &ldquo;On reveal&rdquo; only plays before you answer when hearing the word won&apos;t give the answer away.
              </p>
            </Field>
            <Field label={`Speed · ${settings.audio.rate.toFixed(2)}×`}>
              <input
                type="range"
                min={0.5}
                max={1.3}
                step={0.05}
                value={settings.audio.rate}
                onChange={(e) => settings.setAudio({ rate: Number(e.target.value) })}
                aria-label="Speech speed"
                className="w-full"
              />
            </Field>
            <Field
              label="Voice"
              hint={voices.length ? undefined : "No Japanese voice found. Add one in your device's speech or language settings."}
            >
              <div className="flex gap-3">
                <select
                  value={settings.audio.voiceURI ?? ""}
                  onChange={(e) => settings.setAudio({ voiceURI: e.target.value || null })}
                  aria-label="Japanese voice"
                  className="h-11 min-w-0 flex-1 rounded-full border border-line bg-ink-900 px-4 text-sm text-paper"
                >
                  <option value="">Automatic (best available)</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <Button onClick={() => speak("こんにちは。ことだまへようこそ。")} aria-label="Test voice">
                  <Play className="size-4" /> Test
                </Button>
              </div>
            </Field>
          </>
        )}
      </Panel>

      <Panel eyebrow="Practice" title="Flow">
        <div className="-my-3 divide-y divide-line">
          <Toggle
            checked={settings.autoAdvance}
            onChange={settings.setAutoAdvance}
            label="Move on after a correct answer"
            description="Skips the details card when you get it right."
          />
          <Toggle
            checked={settings.builtInIme}
            onChange={settings.setBuiltInIme}
            label="Built-in kana converter"
            description="In typing mode, turns romaji into kana as you type (taberu → たべる). Handy without a Japanese keyboard."
          />
        </div>
      </Panel>

      <Panel eyebrow="App" title="Install">
        <InstallPrompt />
      </Panel>

      <Panel eyebrow="Data" title="Progress">
        <p className="text-sm text-mist tabular-nums">
          {totals.answered} answers so far, {totals.answered ? Math.round((totals.correct / totals.answered) * 100) : 0}% correct.
          {account === "signed-in"
            ? " Progress is saved to your account; resetting erases it on all your devices."
            : " Progress is stored on this device only."}
        </p>
        <ResetProgress />
      </Panel>
    </motion.div>
  );
}
