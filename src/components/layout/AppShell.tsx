"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Backdrop } from "./Backdrop";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  // The quiz is full-screen: no header or tab bar competing with the card.
  const immersive = usePathname().startsWith("/quiz");
  return (
    <>
      <Backdrop />
      {!immersive && <Header />}
      <main className={cn("relative z-10 flex flex-1 flex-col", !immersive && "pb-24 md:pb-16")}>{children}</main>
      {!immersive && <MobileNav />}
    </>
  );
}
