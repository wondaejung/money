"use client";

import { Badge } from "@/components/ui/badge";

export function MarketToggle() {
  return (
    <Badge variant="secondary" className="px-3 py-1.5 text-sm font-medium">
      한국 주식 · 코스피 / 코스닥
    </Badge>
  );
}
