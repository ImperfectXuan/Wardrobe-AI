"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { APP_NAV_ITEMS, isNavItemActive } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar pt-4 lg:sticky lg:top-14 lg:flex lg:h-[calc(100dvh-3.5rem)]">
      <nav className="flex flex-col gap-1 px-3">
        {APP_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = isNavItemActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                buttonVariants({
                  variant: isActive ? "default" : "ghost",
                }),
                "justify-start gap-2",
                isActive && "font-semibold shadow-none"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
