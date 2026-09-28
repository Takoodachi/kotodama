/**
 * Izanami-style hover: each letter rolls up and is replaced by a copy from
 * below, staggered left to right. Needs a `group` ancestor.
 */
export function SplitText({ text }: { text: string }) {
  return (
    <span className="relative inline-flex overflow-hidden leading-none" aria-label={text}>
      {[...text].map((ch, i) => {
        const glyph = ch === " " ? " " : ch;
        return (
          <span
            key={i}
            aria-hidden
            className="relative inline-block transition-transform duration-500 ease-out-expo group-hover:-translate-y-full motion-reduce:transition-none"
            style={{ transitionDelay: `${i * 16}ms` }}
          >
            <span className="block py-0.5">{glyph}</span>
            <span className="absolute top-full left-0 block py-0.5">{glyph}</span>
          </span>
        );
      })}
    </span>
  );
}
