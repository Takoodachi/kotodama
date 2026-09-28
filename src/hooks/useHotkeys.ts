"use client";

import { useEffect, useRef } from "react";

type KeyMap = Record<string, (event: KeyboardEvent) => void>;

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
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
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat || isTyping(event.target)) return;
      const handler = latest.current[event.key];
      if (handler) {
        event.preventDefault();
        handler(event);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
