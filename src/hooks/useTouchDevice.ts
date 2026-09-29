"use client";

import { useSyncExternalStore } from "react";

/** Phones and tablets: the main pointer is a finger, not a mouse. */
const QUERY = "(pointer: coarse)";

export function isTouchDevice(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches;
}

function subscribe(onChange: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True on phones and tablets. Always false during server rendering. */
export function useTouchDevice(): boolean {
  return useSyncExternalStore(subscribe, isTouchDevice, () => false);
}
