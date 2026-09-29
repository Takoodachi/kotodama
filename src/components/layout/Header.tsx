"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SyncBadge } from "@/components/account/SyncStatus";
import { GuideButton } from "@/components/guide/GuideButton";
import { LogoMark } from "@/components/ui/LogoMark";
import { useScrolled } from "@/hooks/useScrolled";
import { cn } from "@/lib/cn";
import { HEADER_HEIGHT, isActive, NAV_ITEMS } from "./nav";

export function Header() {
  const pathname = usePathname();
  // Transparent over the hero; frosted glass once content scrolls beneath it.
  const scrolled = useScrolled();
  return (
    <header
      className={cn(
        "pt-safe sticky top-0 z-30 border-b transition-[background-color,border-color,backdrop-filter] duration-500",
        scrolled ? "border-line bg-ink-950/75 backdrop-blur-xl" : "border-transparent bg-transparent",
      )}
    >
      <div className={cn("mx-auto flex max-w-6xl items-center justify-between px-4 md:px-8", HEADER_HEIGHT)}>
        <Link href="/" className="flex items-center gap-3 text-paper">
          <LogoMark className="size-6" />
          <span className="font-display text-[13px] tracking-[0.42em]">KOTODAMA</span>
        </Link>
        <div className="flex items-center gap-6 lg:gap-10">
          <nav className="hidden items-center gap-6 md:flex lg:gap-10" aria-label="Main">
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
          <div className="flex items-center gap-2">
            <SyncBadge />
            <GuideButton />
          </div>
        </div>
      </div>
    </header>
  );
}
