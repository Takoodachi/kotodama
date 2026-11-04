import Link from "next/link";
import { cn } from "@/lib/cn";
import { plural } from "@/lib/plural";

const RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Today's answers against the daily goal, as a ring that closes in gold when
 * the goal is met.
 */
export function DailyGoal({ answered, goal }: { answered: number; goal: number }) {
  const met = answered >= goal;
  const share = Math.min(answered / goal, 1);
  return (
    <div className="glass flex items-center gap-4 rounded-2xl p-4 sm:p-5">
      <div
        role="progressbar"
        aria-label="Today's goal"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(answered, goal)}
        aria-valuetext={`${answered} of ${goal} answers`}
        className="relative size-14 shrink-0"
      >
        <svg viewBox="0 0 56 56" className="size-full -rotate-90">
          <circle cx={28} cy={28} r={RADIUS} fill="none" strokeWidth={4} className="stroke-veil/10" />
          <circle
            cx={28}
            cy={28}
            r={RADIUS}
            fill="none"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - share)}
            className={cn(
              "transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none",
              met ? "stroke-gold" : "stroke-crimson",
              share === 0 && "opacity-0",
            )}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-mincho text-sm text-paper tabular-nums">
          {Math.round(share * 100)}%
        </span>
      </div>
      <div className="min-w-0">
        <p className="eyebrow">
          <span lang="ja">目標</span> · Today&apos;s goal
        </p>
        <p className="mt-1 text-sm text-paper">
          {met ? "Done for today" : `${answered} of ${plural(goal, "answer")}`}
          <span className="text-mist">
            {met ? ` · ${plural(answered, "answer")} so far` : ` · ${goal - answered} to go`}
          </span>
        </p>
        <Link href="/settings" className="mt-0.5 inline-block text-xs text-smoke hover:text-paper">
          Change the goal
        </Link>
      </div>
    </div>
  );
}
