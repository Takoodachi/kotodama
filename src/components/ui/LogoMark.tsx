import { cn } from "@/lib/cn";

/** The app mark: 言 ("word") drawn with simple strokes, its dot in crimson. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={cn("size-7", className)}>
      <rect x="45" y="12" width="10" height="10" fill="var(--color-crimson)" />
      <g fill="currentColor">
        <rect x="16" y="28" width="68" height="6" />
        <rect x="27" y="42" width="46" height="5" />
        <rect x="27" y="54" width="46" height="5" />
      </g>
      <rect x="29.5" y="68.5" width="41" height="21" fill="none" stroke="currentColor" strokeWidth="5" />
    </svg>
  );
}
