"use client";

import { useEffect } from "react";

/**
 * One IntersectionObserver for all [data-rev] elements.
 * Adds .in when threshold 0.12 is met. Delay via --d on each element.
 */
export function useReveal(enabled = true): void {
  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") {
      document.querySelectorAll("[data-rev]").forEach((el) => el.classList.add("in"));
      return;
    }

    const seen = new WeakSet<Element>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || seen.has(entry.target)) continue;
          seen.add(entry.target);
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -4% 0px" }
    );

    const observeAll = () => {
      document.querySelectorAll("[data-rev]:not(.in)").forEach((el) => {
        if (!seen.has(el)) io.observe(el);
      });
    };

    observeAll();

    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [enabled]);
}
