"use client";

import { CloudAlert, CloudCheck, CloudOff, RefreshCw } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { useAccount, type SyncStatus } from "@/store/account";

export function syncLabel(sync: SyncStatus, lastSynced: number | null): string {
  switch (sync) {
    case "syncing":
      return "Syncing…";
    case "offline":
      return "Offline";
    case "error":
      return "Couldn't sync";
    default:
      if (!lastSynced) return "Not synced yet";
      return `Synced ${new Date(lastSynced).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }
}

export function SyncStatusIcon({ className }: { className?: string }) {
  const sync = useAccount((s) => s.sync);
  if (sync === "syncing") return <RefreshCw className={cn("animate-spin text-mist", className)} />;
  if (sync === "offline") return <CloudOff className={cn("text-mist", className)} />;
  if (sync === "error") return <CloudAlert className={cn("text-crimson-bright", className)} />;
  return <CloudCheck className={cn("text-gold-bright", className)} />;
}

/** A small cloud in the header while signed in, linking to the account settings. */
export function SyncBadge() {
  const status = useAccount((s) => s.status);
  const sync = useAccount((s) => s.sync);
  const lastSynced = useAccount((s) => s.lastSynced);
  if (status !== "signed-in") return null;
  const label = syncLabel(sync, lastSynced);
  return (
    <Link
      href="/settings#account"
      aria-label={`Account: ${label}`}
      title={label}
      className="flex size-9 items-center justify-center rounded-full border border-line transition-colors hover:border-white/25"
    >
      <SyncStatusIcon className="size-4" />
    </Link>
  );
}
