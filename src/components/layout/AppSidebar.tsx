import Link from "next/link";
import {
  BarChart3,
  LayoutDashboard,
  Target,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type AppNavKey =
  | "dashboard"
  | "portfolio"
  | "predictions"
  | "undervalued";

interface AppSidebarProps {
  current?: AppNavKey;
}

const SIDEBAR_LINKS = [
  {
    href: "/",
    label: "대시보드",
    description: "히트맵 · 브리핑",
    icon: LayoutDashboard,
    key: "dashboard" as const,
  },
  {
    href: "/portfolio",
    label: "내 포트폴리오",
    description: "종목 관리",
    icon: Wallet,
    key: "portfolio" as const,
  },
  {
    href: "/predictions",
    label: "종가 베팅",
    description: "시간외 예측",
    icon: BarChart3,
    key: "predictions" as const,
  },
  {
    href: "/undervalued",
    label: "밸류 픽",
    description: "저평가 스크리닝",
    icon: Target,
    key: "undervalued" as const,
  },
];

export function AppSidebar({ current }: AppSidebarProps) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-14 items-center border-b px-5">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Money
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="사이드바 내비게이션">
        {SIDEBAR_LINKS.map((link) => {
          const Icon = link.icon;
          const active = current === link.key;

          return (
            <Link
              key={link.key}
              href={link.href}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm leading-tight">{link.label}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {link.description}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
