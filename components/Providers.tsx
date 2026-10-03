"use client";

import { useEffect } from "react";
import { useReveal } from "@/hooks/useReveal";

/** Client providers: scroll-reveal only (no Lenis — keeps first load light). */
export function Providers({ children }: { children: React.ReactNode }) {
  useReveal(true);

  useEffect(() => {
    const onScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        docH > 0 ? Math.min(1, Math.max(0, window.scrollY / docH)) : 0;
      document.documentElement.style.setProperty(
        "--progress",
        progress.toFixed(4)
      );
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return <>{children}</>;
}
