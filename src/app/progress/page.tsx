import type { Metadata } from "next";
import { ProgressScreen } from "@/components/stats/ProgressScreen";

export const metadata: Metadata = { title: "Progress" };

export default function ProgressPage() {
  return <ProgressScreen />;
}
