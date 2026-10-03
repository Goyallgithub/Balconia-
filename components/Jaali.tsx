"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  opacity?: number;
};

/**
 * Fine geometric lattice. Stroke-only, currentColor.
 * Use at ~0.06 opacity on paper / footer bands.
 */
export function Jaali({ className, opacity = 0.06 }: Props) {
  const id = useId().replace(/:/g, "");
  const patternId = `jaali-${id}`;

  return (
    <svg
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      aria-hidden
      style={{ opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width="28"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M14 1 L27 14 L14 27 L1 14 Z M14 7 L21 14 L14 21 L7 14 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <circle cx="14" cy="14" r="1.2" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
