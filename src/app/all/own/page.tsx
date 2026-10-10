import type { Metadata } from "next";
import { GridPractice } from "@/components/grid/GridPractice";

export const metadata: Metadata = { title: "Your quiz" };

export default function OwnQuizPage() {
  return <GridPractice own />;
}
