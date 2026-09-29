"use client";

import { usePathname } from "next/navigation";
import { PracticeGuide } from "@/components/guide/PracticeGuide";
import { cn } from "@/lib/cn";
import { Backdrop } from "./Backdrop";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  // The quiz and the all-at-once grid are full-screen: no header or tab bar competing with the cards.
  const pathname = usePathname();
  const immersive = pathname.startsWith("/quiz") || pathname.startsWith("/all");
  return (
    <>
      <Backdrop />
      {!immersive && <Header />}
      <main className={cn("relative z-10 flex flex-1 flex-col", !immersive && "pb-24 md:pb-16")}>{children}</main>
      {!immersive && <MobileNav />}
      {!immersive && <PracticeGuide />}
    </>
  );
}
