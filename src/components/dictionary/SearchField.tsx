"use client";

import { Search, X } from "lucide-react";
import { useRef } from "react";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

/** The dictionary's search box. */
export function SearchField({ value, onChange, autoFocus }: SearchFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-smoke" strokeWidth={1.75} />
      <input
        ref={input}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoFocus={autoFocus}
        placeholder="Search in English, Japanese or romaji"
        aria-label="Search the dictionary"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="search"
        className="h-12 w-full rounded-2xl border border-line bg-veil/[0.03] pr-11 pl-11 text-[15px] text-paper outline-none transition-colors placeholder:text-smoke focus:border-veil/30 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            input.current?.focus();
          }}
          aria-label="Clear the search"
          className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-mist transition-colors hover:bg-veil/5 hover:text-paper"
        >
          <X className="size-4" strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}
