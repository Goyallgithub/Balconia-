"use client";

import { useEffect, useState } from "react";
import { isDiwaliActive } from "@/config/season";
import { Marquee } from "@/components/Marquee";

const STORAGE_KEY = "balconia-diwali-ribbon-dismissed";

export function DiwaliRibbon() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isDiwaliActive()) {
      document.documentElement.style.setProperty("--ribbon-h", "0px");
      return;
    }
    const dismissed = sessionStorage.getItem(STORAGE_KEY) === "1";
    if (!dismissed) {
      setVisible(true);
      document.documentElement.style.setProperty("--ribbon-h", "36px");
    }
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
    document.documentElement.style.setProperty("--ribbon-h", "0px");
  };

  if (!visible) return null;

  const message = (
    <>
      <span>Diwali Edit is live</span>
      <span aria-hidden>·</span>
      <span>Free diyas with every makeover booked this week</span>
      <span aria-hidden>·</span>
      <span>
        Use <strong className="font-medium">DIWALI10</strong> for 10 percent off
      </span>
      <span aria-hidden>·</span>
    </>
  );

  return (
    <div
      className="relative z-[60] flex h-9 items-center bg-marigold text-ink"
      role="region"
      aria-label="Diwali announcement"
    >
      {/* Mobile: scrolling marquee */}
      <div className="min-w-0 flex-1 md:hidden">
        <Marquee className="furniture py-2">{message}</Marquee>
      </div>

      {/* Desktop: static centered line */}
      <p className="furniture hidden flex-1 items-center justify-center gap-3 px-10 text-center md:flex">
        <span>Diwali Edit is live</span>
        <span aria-hidden>·</span>
        <span>Free diyas with every makeover booked this week</span>
        <span aria-hidden>·</span>
        <span>
          Use <strong className="font-medium">DIWALI10</strong> for 10 percent off
        </span>
      </p>

      <button
        type="button"
        onClick={dismiss}
        className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center tap-inline md:right-2"
        aria-label="Dismiss Diwali announcement"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
    </div>
  );
}
