import type { ReactNode } from "react";

import { AppSidebar, type AppNavKey } from "@/components/layout/AppSidebar";
import { BottomNav } from "@/components/layout/BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  current?: AppNavKey;
  title?: string;
}

export function AppLayout({ children, current, title }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar current={current} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden">
          <h1 className="text-base font-semibold">{title ?? "Money"}</h1>
        </header>
        <main className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
