"use client";

import { CloudUpload } from "lucide-react";
import Link from "next/link";
import { SyncStatusIcon } from "@/components/account/SyncStatus";
import { syncNow, useAccount } from "@/store/account";
import { useCustomQuiz } from "@/store/customQuiz";

const clock = (time: number) => new Date(time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/**
 * Where the quiz is kept. Signed in, it is saved to the account by itself a
 * moment after each change, and from there it reaches the learner's other
 * devices; this says whether the latest change is saved yet, with a button to
 * save it now. Signed out, it stays on the device.
 */
export function QuizSaveStatus() {
  const status = useAccount((s) => s.status);
  const sync = useAccount((s) => s.sync);
  const lastSynced = useAccount((s) => s.lastSynced);
  const savedQuiz = useAccount((s) => s.savedQuiz);
  const doc = useCustomQuiz((s) => s.doc);

  if (status === "loading") return null;
  if (status !== "signed-in") {
    return (
      <p className="text-xs leading-relaxed text-smoke">
        Kept on this device.
        {status === "signed-out" && (
          <>
            {" "}
            <Link href="/settings#account" className="text-gold-bright underline-offset-2 hover:underline">
              Sign in
            </Link>{" "}
            to save it to your account and have it on your other devices.
          </>
        )}
      </p>
    );
  }

  const unsaved = doc !== savedQuiz;
  const message =
    sync === "syncing"
      ? "Saving to your account…"
      : sync === "offline"
        ? "Offline. It's kept on this device and goes to your account once you're back online."
        : sync === "error"
          ? "Couldn't save to your account. It's still kept on this device."
          : unsaved
            ? "Not saved to your account yet: that happens in a moment."
            : `Saved to your account${lastSynced ? ` at ${clock(lastSynced)}` : ""}: it's there on your other devices too.`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p className="flex min-w-0 items-start gap-1.5 text-xs leading-relaxed text-mist" role="status">
        <SyncStatusIcon className="mt-0.5 size-3.5 shrink-0" />
        {message}
      </p>
      <button
        type="button"
        onClick={() => void syncNow()}
        disabled={sync === "syncing"}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 text-xs text-mist transition-colors hover:border-veil/25 hover:text-paper disabled:opacity-50"
      >
        <CloudUpload className="size-3.5" strokeWidth={1.75} /> Save now
      </button>
    </div>
  );
}
