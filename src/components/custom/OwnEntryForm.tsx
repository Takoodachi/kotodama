"use client";

import { Check, Plus } from "lucide-react";
import { useId, useState } from "react";
import { JpText } from "@/components/japanese/Furigana";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { draftFrom, needsReading, ownItem, type CustomItem, type OwnDraft, type OwnKind, type OwnProblem } from "@/lib/customQuiz";
import { cn } from "@/lib/cn";
import { toSurface } from "@/lib/furigana";
import { hasJapanese } from "@/lib/jmdict/keys.mjs";
import { newOwnId, useCustomQuiz } from "@/store/customQuiz";

const KINDS: { value: OwnKind; label: string }[] = [
  { value: "vocab", label: "Word" },
  { value: "phrase", label: "Phrase" },
  { value: "sentence", label: "Sentence" },
];

const KIND_NAMES: Record<OwnKind, string> = { vocab: "word", phrase: "phrase", sentence: "sentence" };

interface TextFieldProps extends React.ComponentProps<"input"> {
  label: string;
  hint: string;
  error?: string;
}

function TextField({ label, hint, error, className, ...input }: TextFieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm text-paper">
        {label}
      </label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={!!error}
        aria-describedby={`${id}-note`}
        className={cn(
          "mt-1.5 h-11 w-full rounded-xl border bg-veil/[0.03] px-3.5 text-[15px] text-paper outline-none transition-colors placeholder:text-smoke focus:border-veil/30",
          error ? "border-crimson/60" : "border-line",
          className,
        )}
        {...input}
      />
      <p id={`${id}-note`} role={error ? "alert" : undefined} className={cn("mt-1 text-xs leading-relaxed", error ? "text-crimson-bright" : "text-smoke")}>
        {error ?? hint}
      </p>
    </div>
  );
}

interface OwnEntryFormProps {
  /** What was searched for: the form starts from it. */
  query: string;
  /** Whether the dictionary had anything for it. */
  found: boolean;
}

/**
 * Where the learner writes an entry the dictionary doesn't have: a word, or a
 * phrase or sentence of their own. It needs the Japanese and the meaning, and
 * the reading where kanji leave it open. Saved, it is in their dictionary and
 * in the quiz being built.
 */
export function OwnEntryForm({ query, found }: OwnEntryFormProps) {
  const saveOwn = useCustomQuiz((s) => s.saveOwn);
  const [draft, setDraft] = useState(() => draftFrom(query));
  const [problem, setProblem] = useState<OwnProblem | null>(null);
  const [saved, setSaved] = useState<CustomItem | null>(null);

  const change = (fields: Partial<OwnDraft>) => {
    setDraft({ ...draft, ...fields });
    setProblem(null);
  };
  const japanese = draft.japanese.trim();
  // Romaji there becomes kana, which reads itself.
  const wantsReading = hasJapanese(japanese) && needsReading(japanese);
  const made = ownItem(draft, "own-preview");
  const preview = "field" in made ? null : made;
  const errorFor = (field: OwnProblem["field"]) => (problem?.field === field ? problem.message : undefined);

  if (saved) {
    return (
      <div className="glass mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 sm:p-5" role="status">
        <p className="flex min-w-0 items-center gap-2 text-sm text-mist">
          <Check className="size-4 shrink-0 text-gold-bright" strokeWidth={2} />
          <span className="min-w-0">
            <JpText text={saved.jp} ruby="none" className="text-paper" /> is in your dictionary and your quiz.
          </span>
        </p>
        <button
          type="button"
          onClick={() => {
            setDraft({ kind: draft.kind, japanese: "", reading: "", meaning: "" });
            setSaved(null);
          }}
          className="flex h-8 items-center gap-1 rounded-full border border-line pr-3 pl-2 text-xs text-mist transition-colors hover:border-veil/25 hover:text-paper"
        >
          <Plus className="size-3.5" /> Write another
        </button>
      </div>
    );
  }

  return (
    <form
      className="glass mt-3 space-y-4 rounded-2xl p-4 sm:p-5"
      aria-label="Add your own entry"
      onSubmit={(event) => {
        event.preventDefault();
        const item = ownItem(draft, newOwnId());
        if ("field" in item) return setProblem(item);
        saveOwn(item);
        setSaved(item);
      }}
    >
      <div>
        <p className="eyebrow">Your own entry</p>
        <h3 className="mt-1.5 font-mincho text-xl leading-snug text-paper">
          {found ? "Add it yourself" : <>&ldquo;{query}&rdquo; isn&apos;t in the dictionary</>}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-mist">
          {found ? "Write" : "Add it yourself: write"} it in Japanese with its meaning, and it joins your dictionary and
          your quiz. Phrases and sentences of your own go in the same way.
        </p>
      </div>

      <SegmentedControl label="Kind of entry" value={draft.kind} onChange={(kind) => change({ kind })} options={KINDS} />
      <TextField
        label="In Japanese"
        hint="How it's written, in kana or kanji. Without a Japanese keyboard, romaji will do: it becomes kana."
        lang="ja"
        placeholder={draft.kind === "vocab" ? "食べる" : draft.kind === "phrase" ? "お元気ですか" : "私は学生です。"}
        value={draft.japanese}
        onChange={(event) => change({ japanese: event.target.value })}
        error={errorFor("japanese")}
      />
      {wantsReading && (
        <TextField
          label="Reading"
          hint="How it's read, in kana or romaji. Kanji alone don't say."
          placeholder={draft.kind === "vocab" ? "たべる or taberu" : "in kana or romaji"}
          value={draft.reading}
          onChange={(event) => change({ reading: event.target.value })}
          error={errorFor("reading")}
        />
      )}
      <TextField
        label="Meaning in English"
        hint="What it means. A semicolon separates meanings that should each count: to eat; to have a meal"
        placeholder={draft.kind === "vocab" ? "to eat" : draft.kind === "phrase" ? "How are you?" : "I am a student."}
        value={draft.meaning}
        onChange={(event) => change({ meaning: event.target.value })}
        error={errorFor("meaning")}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {preview ? (
          <p className="min-w-0 text-xs text-mist">
            <span className="mr-2 text-[11px] tracking-wide text-smoke">Preview</span>
            <JpText text={preview.jp} className={cn("mr-2 text-paper", [...toSurface(preview.jp)].length > 8 ? "text-base leading-[2]" : "text-xl leading-[1.9]")} />
            {preview.meaning.join("; ")}
          </p>
        ) : (
          <span />
        )}
        <Button type="submit" variant="primary">
          <Plus className="size-4" /> Add this {KIND_NAMES[draft.kind]}
        </Button>
      </div>
    </form>
  );
}
