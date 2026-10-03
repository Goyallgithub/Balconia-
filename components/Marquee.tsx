"use client";

import { cn } from "@/lib/cn";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function Marquee({ children, className }: Props) {
  return (
    <div className={cn("overflow-hidden", className)} aria-hidden={false}>
      <div className="marquee-track">
        <div className="flex shrink-0 items-center gap-8 px-4">{children}</div>
        <div className="flex shrink-0 items-center gap-8 px-4" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
