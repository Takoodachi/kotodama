"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/ui/LogoMark";
import { cn } from "@/lib/cn";
import { isActive, NAV_ITEMS } from "./nav";

export function Header() {
  const pathname = usePathname();
  return (
    <header className="pt-safe sticky top-0 z-30 bg-gradient-to-b from-ink-950/90 via-ink-950/60 to-transparent backdrop-blur-[2px]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:h-18 md:px-8">
        <Link href="/" className="flex items-center gap-3 text-paper">
          <LogoMark className="size-6" />
          <span className="font-display text-[13px] tracking-[0.42em]">KOTODAMA</span>
        </Link>
        <nav className="hidden items-center gap-10 md:flex" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative py-2 font-display text-[11px] tracking-[0.32em] uppercase transition-colors",
                  active ? "text-paper" : "text-mist hover:text-paper",
                )}
              >
                {item.label}
                {active && (
                  <motion.span
                    layoutId="header-active"
                    className="absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-crimson"
                  />
                )}
              </Link>
            );
          })}
        </nav>
        <span className="jp text-sm tracking-[0.3em] text-smoke md:hidden">言霊</span>
      </div>
    </header>
  );
}
