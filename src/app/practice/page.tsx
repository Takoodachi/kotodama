import type { Metadata } from "next";
import { SelectionScreen } from "@/components/selection/SelectionScreen";

export const metadata: Metadata = { title: "Practice" };

export default function PracticePage() {
  return <SelectionScreen />;
}
