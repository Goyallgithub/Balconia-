"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SoftImage } from "@/components/SoftImage";
import { cn } from "@/lib/cn";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  className?: string;
  aspectClassName?: string;
  tease?: boolean;
};

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  className,
  aspectClassName = "aspect-[4/5]",
  tease = true,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(50);
  const [dragging, setDragging] = useState(false);
  const teased = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setValue(Math.min(100, Math.max(0, next)));
  }, []);

  useEffect(() => {
    if (!tease || teased.current) return;
    const el = trackRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    let frame = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || teased.current) return;
        teased.current = true;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          io.disconnect();
          return;
        }
        const start = performance.now();
        const animate = (t: number) => {
          const elapsed = t - start;
          if (elapsed < 500) setValue(50 + (20 * elapsed) / 500);
          else if (elapsed < 1100) setValue(70 - (20 * (elapsed - 500)) / 600);
          else {
            setValue(50);
            return;
          }
          frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        io.disconnect();
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [tease]);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => setFromClientX(e.clientX);
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, setFromClientX]);

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative w-full overflow-hidden bg-paper-2 select-none touch-pan-y",
        aspectClassName,
        className
      )}
      data-cursor="drag"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).tagName === "INPUT") return;
        setDragging(true);
        setFromClientX(e.clientX);
      }}
    >
      {/* After (full) */}
      <SoftImage
        src={afterSrc}
        alt={afterAlt}
        fill
        sizes="(max-width: 768px) 92vw, 33vw"
        className="object-cover"
        filename={afterSrc.split("/").pop()}
      />

      {/* Before (clipped from left) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}
      >
        <SoftImage
          src={beforeSrc}
          alt={beforeAlt}
          fill
          sizes="(max-width: 768px) 92vw, 33vw"
          className="object-cover"
          filename={beforeSrc.split("/").pop()}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 z-10 w-px bg-plaster"
        style={{ left: `${value}%` }}
      >
        <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-plaster bg-night/50 text-plaster">
          <svg width="18" height="10" viewBox="0 0 18 10" aria-hidden>
            <path d="M5 1 L1 5 L5 9" stroke="currentColor" strokeWidth="1" fill="none" />
            <path d="M13 1 L17 5 L13 9" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </div>
      </div>

      <span className="furniture pointer-events-none absolute left-3 top-3 z-10 bg-night/55 px-2 py-1 text-plaster">
        Before
      </span>
      <span className="furniture pointer-events-none absolute right-3 top-3 z-10 bg-night/55 px-2 py-1 text-plaster">
        After
      </span>

      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        aria-label="Compare before and after"
        role="slider"
        className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
        onChange={(e) => setValue(Number(e.target.value))}
      />
    </div>
  );
}
