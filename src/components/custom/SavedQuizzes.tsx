"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useArmed } from "@/hooks/useArmed";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/plural";
import type { SavedQuiz } from "@/lib/sync/ownDoc";
import { useCustomQuiz } from "@/store/customQuiz";
import { DeleteButton } from "./DeleteButton";

const sameIds = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

interface SavedRowProps {
  saved: SavedQuiz & { id: string };
  /** It is the quiz being built right now. */
  loaded: boolean;
  /** Loading it would lose a quiz that isn't saved anywhere, so it asks first. */
  risky: boolean;
}

function SavedRow({ saved, loaded, risky }: SavedRowProps) {
  const loadQuiz = useCustomQuiz((s) => s.loadQuiz);
  const deleteSaved = useCustomQuiz((s) => s.deleteSaved);
  const [replacing, pressLoad] = useArmed();
  const load = () => loadQuiz(saved.id);

  return (
    <li className="flex items-center gap-2 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-paper">{saved.name}</p>
        <p className="text-xs text-smoke tabular-nums">
          {plural(saved.ids.length, "item")}
          {loaded && <span className="text-gold-bright"> · the quiz above</span>}
        </p>
      </div>
      <button
        type="button"
        disabled={loaded}
        onClick={() => (risky ? pressLoad(load) : load())}
        aria-label={loaded ? `${saved.name} is loaded` : `Load ${saved.name}`}
        className={cn(
          "h-8 shrink-0 rounded-full border px-3.5 text-xs whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40",
          replacing ? "border-crimson/60 text-crimson-bright" : "border-veil/25 text-paper hover:border-gold/60 hover:text-gold-bright",
        )}
      >
        {loaded ? "Loaded" : replacing ? "Replace your quiz?" : "Load"}
      </button>
      <DeleteButton label={`the saved quiz ${saved.name}`} title="Delete this saved quiz" onDelete={() => deleteSaved(saved.id)} />
    </li>
  );
}

/**
 * Quizzes put by under a name, to come back to: the one being built can be
 * saved as it is, and any saved one loaded in its place. Signed in, they go
 * with the account like the quiz does.
 */
export function SavedQuizzes() {
  const quiz = useCustomQuiz((s) => s.quiz);
  const saved = useCustomQuiz((s) => s.saved);
  const saveQuiz = useCustomQuiz((s) => s.saveQuiz);
  const [name, setName] = useState("");
  const [savedAs, setSavedAs] = useState<string | null>(null);
  const inputId = useId();

  if (!quiz.length && !saved.length) return null;

  let next = saved.length + 1;
  while (saved.some((other) => other.name === `Quiz ${next}`)) next++;
  const typed = name.trim() || `Quiz ${next}`;
  const replaces = saved.some((other) => other.name === typed);
  // The quiz being built is lost on loading another unless it is saved, or empty.
  const unsaved = quiz.length > 0 && !saved.some((other) => sameIds(other.ids, quiz));

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    saveQuiz(typed);
    setName("");
    setSavedAs(typed);
  };

  return (
    <section className="glass rounded-2xl p-4 sm:p-6" aria-labelledby="saved-quizzes-title">
      <p className="eyebrow">Saved quizzes</p>
      <h2 id="saved-quizzes-title" className="mt-1.5 flex items-baseline gap-3">
        <span lang="ja" className="jp text-2xl text-paper">
          保存
        </span>
        <span className="text-xs text-mist tabular-nums">{plural(saved.length, "quiz", "quizzes")}</span>
      </h2>

      {quiz.length > 0 && (
        <form onSubmit={save} className="mt-3">
          <label htmlFor={inputId} className="text-sm text-paper">
            Save the quiz above as
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id={inputId}
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSavedAs(null);
              }}
              placeholder={`Quiz ${next}`}
              maxLength={60}
              autoComplete="off"
              aria-describedby={`${inputId}-note`}
              className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-veil/[0.03] px-3.5 text-[15px] text-paper outline-none transition-colors placeholder:text-smoke focus:border-veil/30"
            />
            <Button type="submit" variant="gold">
              {replaces ? "Replace" : "Save"}
            </Button>
          </div>
          <p id={`${inputId}-note`} role="status" className="mt-1 text-xs leading-relaxed text-smoke">
            {savedAs
              ? `Saved as “${savedAs}”.`
              : replaces
                ? `This replaces the quiz saved as “${typed}”.`
                : "Load it again any time from the list below."}
          </p>
        </form>
      )}

      {saved.length > 0 && (
        <ul className="mt-3 divide-y divide-line border-t border-line" aria-label="Saved quizzes">
          {saved.map((entry) => (
            <SavedRow key={entry.id} saved={entry} loaded={sameIds(entry.ids, quiz)} risky={unsaved} />
          ))}
        </ul>
      )}
    </section>
  );
}
