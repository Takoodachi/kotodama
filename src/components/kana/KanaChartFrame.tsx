"use client";

import type { KanaScript } from "@/data/kanaChart";
import { useHydrated } from "@/hooks/useHydrated";
import { cn } from "@/lib/cn";
import { useSettings } from "@/store/settings";
import { KanaChart } from "./KanaChart";
import { KanaChartSheet } from "./KanaChartSheet";

function Side({ script, className }: { script: KanaScript; className?: string }) {
  return (
    <aside
      className={cn(
        "glass sticky hidden w-66 shrink-0 self-start overflow-y-auto rounded-2xl p-3 wide:block",
        className,
      )}
    >
      <KanaChart script={script} />
    </aside>
  );
}

interface KanaChartFrameProps {
  /** The page: it takes the middle, as wide as it would be alone if there's room. */
  children: React.ReactNode;
  /** Where the sides stick while the page scrolls, and how tall they may get: what's above and below them differs by page. */
  side: string;
}

/**
 * A page with the kana chart to hand. On a wide screen it stands at both
 * sides, hiragana left and katakana right, where the page would otherwise
 * leave empty margins; <KanaChartButton /> hides and shows it. On anything
 * narrower the same button opens it in a sheet.
 */
export function KanaChartFrame({ children, side }: KanaChartFrameProps) {
  // The saved choice isn't known until then, and the sides shouldn't flash in only to go.
  const hydrated = useHydrated();
  const shown = useSettings((s) => s.kanaChart) && hydrated;
  return (
    <div className="flex w-full flex-1 justify-center wide:gap-5 wide:px-3">
      {children}
      {shown && (
        <>
          <Side script="hiragana" className={cn("order-first", side)} />
          <Side script="katakana" className={side} />
        </>
      )}
      <KanaChartSheet />
    </div>
  );
}
