"use client";

import { useEffect } from "react";

export function BriefingHashScroll() {
  useEffect(() => {
    if (window.location.hash === "#briefing") {
      window.requestAnimationFrame(() => {
        document.getElementById("briefing")?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, []);

  return null;
}
