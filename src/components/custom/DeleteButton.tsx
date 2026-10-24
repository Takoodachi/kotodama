"use client";

import { Trash2 } from "lucide-react";
import { useArmed } from "@/hooks/useArmed";

interface DeleteButtonProps {
  /** What is deleted, for screen readers: "Delete …". */
  label: string;
  title: string;
  onDelete: () => void;
}

/** A small bin that deletes on the second press. */
export function DeleteButton({ label, title, onDelete }: DeleteButtonProps) {
  const [armed, press] = useArmed();
  return (
    <button
      type="button"
      onClick={() => press(onDelete)}
      aria-label={armed ? `Press again to delete ${label}` : `Delete ${label}`}
      title={armed ? "Press again to delete it" : title}
      className={
        armed
          ? "flex h-8 shrink-0 items-center rounded-full border border-crimson/60 px-3 text-xs whitespace-nowrap text-crimson-bright"
          : "flex size-8 shrink-0 items-center justify-center rounded-full text-smoke transition-colors hover:bg-veil/5 hover:text-paper"
      }
    >
      {armed ? "Delete?" : <Trash2 className="size-3.5" strokeWidth={1.75} />}
    </button>
  );
}
