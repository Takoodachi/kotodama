import type { Metadata } from "next";
import { DictionaryScreen } from "@/components/dictionary/DictionaryScreen";

export const metadata: Metadata = { title: "Dictionary" };

export default function DictionaryPage() {
  return <DictionaryScreen />;
}
