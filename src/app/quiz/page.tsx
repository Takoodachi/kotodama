import type { Metadata } from "next";
import { QuizRunner } from "@/components/quiz/QuizRunner";

export const metadata: Metadata = { title: "Quiz" };

export default function QuizPage() {
  return <QuizRunner />;
}
