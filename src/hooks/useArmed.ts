"use client";

import { useEffect, useState } from "react";

/** A button that acts on the second press: the first one arms it for a few seconds. */
export function useArmed(): [boolean, (act: () => void) => void] {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);
  const press = (act: () => void) => {
    if (!armed) return setArmed(true);
    act();
    setArmed(false);
  };
  return [armed, press];
}
