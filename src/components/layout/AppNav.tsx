import Link from "next/link";

import { cn } from "@/lib/utils";

interface AppNavProps {
  current?: "dashboard" | "portfolio" | "predictions" | "undervalued";
}

export function AppNav({ current }: AppNavProps) {
  const links = [
    { href: "/", label: "대시보드", key: "dashboard" as const },
    { href: "/portfolio", label: "내 포트폴리오", key: "portfolio" as const },
    {
      href: "/predictions",
      label: "종가 베팅",
      key: "predictions" as const,
    },
    {
      href: "/undervalued",
      label: "밸류 픽",
      key: "undervalued" as const,
    },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight">
          Money
        </Link>
        <div className="flex gap-1">
          {links.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                current === link.key
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
