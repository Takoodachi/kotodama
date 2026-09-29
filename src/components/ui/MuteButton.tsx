"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useHydrated } from "@/hooks/useHydrated";
import { cn } from "@/lib/cn";
import { useSettings } from "@/store/settings";

/** Turns every pronunciation in the app off or back on. */
export function MuteButton({ className }: { className?: string }) {
  const hydrated = useHydrated();
  const muted = useSettings((s) => s.muted) && hydrated;
  const setMuted = useSettings((s) => s.setMuted);
  const label = muted ? "Sound off: tap to turn it on" : "Sound on: tap to mute";
  return (
    <button
      type="button"
      aria-pressed={muted}
      aria-label={muted ? "Unmute" : "Mute"}
      title={label}
      onClick={() => setMuted(!muted)}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
        muted
          ? "border-crimson/50 text-crimson-bright hover:border-crimson"
          : "border-line text-mist hover:border-veil/25 hover:text-paper",
        className,
      )}
    >
      {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </button>
  );
}
