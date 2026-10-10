/** Scrolling glides, unless the device asks for reduced motion. */
export const scrolling = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

/** Goes to the very top or the very bottom of the page. */
export function jumpTo(end: "top" | "bottom") {
  window.scrollTo({ top: end === "top" ? 0 : document.documentElement.scrollHeight, behavior: scrolling() });
}
