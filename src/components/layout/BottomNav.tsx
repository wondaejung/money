"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  LayoutGrid,
  Newspaper,
  Settings,
  TrendingDown,
} from "lucide-react";

import { cn } from "@/lib/utils";

const MOBILE_NAV = [
  { href: "/", label: "히트맵", icon: LayoutGrid, key: "heatmap" },
  { href: "/#briefing", label: "브리핑", icon: Newspaper, key: "briefing" },
  { href: "/predictions", label: "종가베팅", icon: BarChart3, key: "predictions" },
  { href: "/undervalued", label: "저평가", icon: TrendingDown, key: "undervalued" },
  { href: "/portfolio", label: "설정", icon: Settings, key: "settings" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/#briefing") {
    return pathname === "/";
  }
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  function handleBriefingClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname === "/") {
      event.preventDefault();
      document.getElementById("briefing")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    router.push("/#briefing");
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="하단 내비게이션"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={item.key === "briefing" ? handleBriefingClick : undefined}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] font-medium transition-colors sm:text-[10px]",
                active
                  ? "text-foreground"
                  : "text-muted-foreground active:text-foreground",
              )}
            >
              <Icon
                className={cn("size-5 shrink-0", active && "text-primary")}
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
