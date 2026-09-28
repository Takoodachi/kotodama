"use client";

import { useEffect, useRef } from "react";

type KeyMap = Record<string, (event: KeyboardEvent) => void>;

/** Keys that work even while a text field has focus. */
const ALWAYS_ACTIVE = new Set(["Escape"]);

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return true;
  // A read-only field (an answered question) no longer takes typing.
  return target instanceof HTMLInputElement && !target.readOnly;
}

/**
 * Global keyboard shortcuts, ignored while the user is typing in a field.
 * Keys are `KeyboardEvent.key` values ("1", "Enter", " ").
 */
export function useHotkeys(keys: KeyMap, enabled = true) {
  const latest = useRef(keys);
  useEffect(() => {
    latest.current = keys;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (isTyping(event.target) && !ALWAYS_ACTIVE.has(event.key)) return;
      const handler = latest.current[event.key];
      if (handler) {
        // Also stops the focused button or form from acting on the same key.
        event.preventDefault();
        handler(event);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
