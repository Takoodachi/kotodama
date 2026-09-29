import type { Metadata } from "next";
import { GridPractice } from "@/components/grid/GridPractice";

export const metadata: Metadata = { title: "All at once" };

export default function AllAtOncePage() {
  return <GridPractice />;
}
