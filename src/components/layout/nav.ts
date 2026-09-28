import { House, LayoutGrid, Settings2, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  jp: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", jp: "家", icon: House },
  { href: "/practice", label: "Practice", jp: "練習", icon: LayoutGrid },
  { href: "/settings", label: "Settings", jp: "設定", icon: Settings2 },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
