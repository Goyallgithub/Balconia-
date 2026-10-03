"use client";

import { useRef } from "react";
import Link from "next/link";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { SplitWords } from "@/components/SplitWords";
import type { GalleryItem } from "@/data/gallery";

type Props = {
  items: GalleryItem[];
};

export function TransformationCarousel({ items }: Props) {
  const scroller = useRef<HTMLDivElement>(null);

  const scrollByCard = (dir: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const w = card?.offsetWidth ?? el.clientWidth * 0.85;
    el.scrollBy({ left: dir * (w + 16), behavior: "smooth" });
  };

  return (
    <section
      className="band bg-plaster px-0 py-12 md:py-16"
      aria-labelledby="carousel-heading"
    >
      <div className="mb-8 flex items-end justify-between gap-4 px-4 md:px-8">
        <div className="max-w-xl">
          <p className="furniture text-grey" data-rev>
            Real balconies
          </p>
          <SplitWords
            as="h2"
            id="carousel-heading"
            className="display mt-3 text-[clamp(2rem,6vw,3.5rem)] tracking-[-0.04em]"
            text="Drag the line. See the change."
          />
        </div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center border border-ink"
            aria-label="Previous transformation"
            onClick={() => scrollByCard(-1)}
          >
            ←
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center border border-ink"
            aria-label="Next transformation"
            onClick={() => scrollByCard(1)}
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:gap-6 md:px-8"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item, i) => (
          <article
            key={item.slug}
            data-card
            className="w-[85vw] max-w-md shrink-0 snap-center sm:w-[70vw] md:w-[min(420px,38vw)]"
            data-rev
            style={{ ["--d" as string]: 40 + i * 60 }}
          >
            <BeforeAfterSlider
              beforeSrc={item.before}
              afterSrc={item.after}
              beforeAlt={`${item.title} before in ${item.city}`}
              afterAlt={`${item.title} after in ${item.city}`}
            />
            <div className="mt-4 flex items-start justify-between gap-3 border-t border-ink/10 pt-4">
              <div>
                <Link
                  href={`/gallery/${item.slug}`}
                  className="tap-inline text-xl tracking-[-0.02em]"
                >
                  {item.title}
                </Link>
                <p className="furniture mt-2 text-grey">
                  {item.city} · {item.size} · {item.style}
                </p>
              </div>
              <Link
                href={`/gallery/${item.slug}`}
                className="furniture tap-inline shrink-0 text-accent"
              >
                Shop look
              </Link>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              {item.caption}
            </p>
          </article>
        ))}

        <Link
          href="/gallery"
          className="flex w-[70vw] max-w-xs shrink-0 snap-center flex-col items-start justify-between border border-ink/20 bg-paper p-6 md:w-[280px]"
          data-rev
          style={{ ["--d" as string]: 200 }}
        >
          <p className="furniture text-grey">Gallery</p>
          <p className="display mt-6 text-3xl tracking-[-0.03em]">
            View all transformations
          </p>
          <span className="furniture mt-10 text-accent">Open gallery →</span>
        </Link>
      </div>
    </section>
  );
}
