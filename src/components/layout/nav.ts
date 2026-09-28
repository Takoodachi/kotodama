import { ChartSpline, House, LayoutGrid, Settings2, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  jp: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", jp: "家", icon: House },
  { href: "/practice", label: "Practice", jp: "練習", icon: LayoutGrid },
  { href: "/progress", label: "Progress", jp: "進歩", icon: ChartSpline },
  { href: "/settings", label: "Settings", jp: "設定", icon: Settings2 },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Height of the sticky header, for elements that stick just below it. */
export const HEADER_HEIGHT = "h-14 md:h-18";
export const BELOW_HEADER = "top-14 md:top-18";
