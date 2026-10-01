import { cn } from "@/lib/cn";

const link = "text-paper underline decoration-veil/30 underline-offset-4 transition-colors hover:decoration-veil/60";

/** Who made the dictionary data, and under what licence. The caller sets the text's size and colour. */
export function DictionaryCredits({ date, className }: { date?: string; className?: string }) {
  return (
    <p className={cn("leading-relaxed", className)}>
      Dictionary entries come from{" "}
      <a
        href="https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project"
        target="_blank"
        rel="noreferrer"
        className={link}
      >
        JMdict
      </a>{" "}
      and kanji from{" "}
      <a href="https://www.edrdg.org/wiki/index.php/KANJIDIC_Project" target="_blank" rel="noreferrer" className={link}>
        KANJIDIC
      </a>
      {date && ` (${date})`}, the property of the{" "}
      <a href="https://www.edrdg.org/" target="_blank" rel="noreferrer" className={link}>
        Electronic Dictionary Research and Development Group
      </a>
      , used under its{" "}
      <a href="https://www.edrdg.org/edrdg/licence.html" target="_blank" rel="noreferrer" className={link}>
        licence
      </a>{" "}
      (CC BY-SA 4.0). The JLPT levels of words follow Jonathan Waller&apos;s{" "}
      <a href="https://www.tanos.co.uk/jlpt/" target="_blank" rel="noreferrer" className={link}>
        JLPT word lists
      </a>
      , matched to JMdict by{" "}
      <a href="https://github.com/stephenmk/yomitan-jlpt-vocab" target="_blank" rel="noreferrer" className={link}>
        yomitan-jlpt-vocab
      </a>
      .
    </p>
  );
}
