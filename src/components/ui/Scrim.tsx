"use client";

import { motion } from "motion/react";

const CLEAR = { backgroundColor: "rgba(0, 0, 0, 0)", backdropFilter: "blur(0px)", WebkitBackdropFilter: "blur(0px)" };
const DIMMED = { backgroundColor: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" };

/**
 * The dimmed, blurred page behind a dialog. It animates its own tint and blur
 * and must not sit inside anything that fades: a backdrop blur can't see
 * through a parent that is less than fully opaque, so it would only snap in
 * once the fade was over.
 */
export function Scrim({ onClick, exitDuration = 0.3 }: { onClick: () => void; exitDuration?: number }) {
  return (
    <motion.div
      aria-hidden
      onClick={onClick}
      className="absolute inset-0"
      initial={CLEAR}
      animate={{ ...DIMMED, transition: { duration: 0.2, ease: "easeOut" } }}
      exit={{ ...CLEAR, transition: { duration: exitDuration, ease: "easeInOut" } }}
    />
  );
}
