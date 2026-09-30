"use client";

import { Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** A quieter second line. */
  description?: string;
}

interface SelectProps<T extends string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  /** Accessible name. */
  label: string;
  className?: string;
}

/** Room the list needs below the button before it opens upward instead. */
const LIST_ROOM = 340;

/**
 * A drop-down list in the app's own style, in place of the browser's. Arrow
 * keys, Home, End and typing a name move through it; Enter or Space picks;
 * Esc closes.
 */
export function Select<T extends string>({ value, options, onChange, label, className }: SelectProps<T>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [above, setAbove] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];

  const show = () => {
    const box = button.current!.getBoundingClientRect();
    const below = window.innerHeight - box.bottom;
    setAbove(below < LIST_ROOM && box.top > below);
    setActive(selectedIndex);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  const pick = (index: number) => {
    onChange(options[index].value);
    close();
  };

  /** Jumps to the next option starting with what was just typed; `at` is the key's time stamp. */
  const typeAhead = (key: string, at: number) => {
    const t = typed.current;
    t.text = at - t.at < 700 ? t.text + key.toLowerCase() : key.toLowerCase();
    t.at = at;
    // A fresh letter moves past the current option; a longer prefix may stay on it.
    const from = t.text.length === 1 ? active + 1 : active;
    for (let k = 0; k < options.length; k++) {
      const i = (from + k) % options.length;
      if (options[i].label.toLowerCase().startsWith(t.text)) return setActive(i);
    }
  };

  // Keys go to the list while it's open.
  useEffect(() => {
    if (open) list.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  // A press anywhere else closes it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const onListKey = (event: React.KeyboardEvent) => {
    const last = options.length - 1;
    switch (event.key) {
      case "ArrowDown":
        setActive((a) => Math.min(a + 1, last));
        break;
      case "ArrowUp":
        setActive((a) => Math.max(a - 1, 0));
        break;
      case "Home":
        setActive(0);
        break;
      case "End":
        setActive(last);
        break;
      case "Enter":
      case " ":
        pick(active);
        break;
      case "Escape":
        close();
        break;
      case "Tab":
        // Focus moves on as usual.
        setOpen(false);
        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) typeAhead(event.key, event.timeStamp);
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        ref={button}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={`${label}: ${selected?.label ?? ""}`}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          show();
        }}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-full border bg-veil/[0.02] pr-3 pl-4 text-left text-sm text-paper transition-colors",
          open ? "border-veil/25 bg-veil/[0.05]" : "border-line hover:border-veil/20 hover:bg-veil/[0.04]",
        )}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-mist transition-transform duration-300", open && "rotate-180")}
          strokeWidth={1.75}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            aria-activedescendant={`${id}-${active}`}
            onKeyDown={onListKey}
            initial={{ opacity: 0, y: above ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: above ? 6 : -6, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute inset-x-0 z-30 max-h-80 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-ink-900/95 p-1.5 shadow-2xl shadow-black/50 outline-none backdrop-blur-xl [scrollbar-color:color-mix(in_srgb,var(--color-veil)_22%,transparent)_transparent] [scrollbar-width:thin] light:shadow-black/15",
              above ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top",
            )}
          >
            {options.map((option, i) => {
              const chosen = option.value === value;
              return (
                <li
                  key={option.value}
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={chosen}
                  onMouseMove={() => active !== i && setActive(i)}
                  onClick={() => pick(i)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                    i === active && "bg-veil/[0.06]",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm", chosen ? "text-gold-bright" : "text-paper")}>
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="block truncate text-[11px] text-smoke">{option.description}</span>
                    )}
                  </span>
                  {chosen && <Check className="size-4 shrink-0 text-gold-bright" strokeWidth={2.5} />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
