import { LayoutDashboard, Shirt, Settings, type LucideIcon } from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
};

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { href: "/", label: "仪表盘", shortLabel: "仪表盘", icon: LayoutDashboard },
  { href: "/wardrobe", label: "我的衣柜", shortLabel: "衣柜", icon: Shirt },
  { href: "/settings", label: "设置", shortLabel: "设置", icon: Settings },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
