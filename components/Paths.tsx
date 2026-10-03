"use client";

import { useState } from "react";
import Link from "next/link";
import { SoftImage } from "@/components/SoftImage";
import { SplitWords } from "@/components/SplitWords";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/cn";

const PATHS = [
  {
    index: "01",
    title: "Do it for me",
    italic: "designer visit, curated decor, full installation",
    priceHint: `From ${formatINR(14999)}`,
    href: "/book",
    cta: "Book a makeover",
    primary: true,
    image: "/photos/after-03.jpg",
    bullets: [
      "On-site or video measure and style brief",
      "Mood board plus shopping list before you pay",
      "Decor supply and installation across major cities",
    ],
  },
  {
    index: "02",
    title: "I'll do it myself",
    italic: "tell us your balcony, get a shoppable list in minutes",
    priceHint: "From ₹0 to get the list",
    href: "/diy",
    cta: "Get my list",
    primary: false,
    image: "/photos/after-02.jpg",
    bullets: [
      "Four quick questions about size, light, and style",
      "Rule-based bundle from our shop catalog",
      "Add everything to cart in one tap",
    ],
  },
] as const;

export function Paths() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section
      id="how-it-works"
      className="band bg-blush px-4 py-12 md:px-8 md:py-16"
      aria-labelledby="paths-heading"
    >
      <div className="mx-auto max-w-[1200px]">
        <SplitWords
          as="h2"
          id="paths-heading"
          className="display text-[clamp(2rem,6vw,3.75rem)] tracking-[-0.04em]"
          text="How would you like to do it?"
        />

        <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-10">
          {PATHS.map((path, i) => {
            const expanded = open === path.index;
            return (
              <article
                key={path.index}
                className="flex flex-col"
                data-rev
                style={{ ["--d" as string]: 60 + i * 80 }}
              >
                <button
                  type="button"
                  className="group w-full text-left md:cursor-default"
                  onClick={() =>
                    setOpen((v) => (v === path.index ? null : path.index))
                  }
                  aria-expanded={expanded}
                >
                  <div className="arch-mask relative aspect-[4/5] overflow-hidden bg-paper-2 md:transition-transform md:duration-500 md:group-hover:-translate-y-2"
                    style={{ transitionTimingFunction: "var(--ease)" }}
                  >
                    <SoftImage
                      src={path.image}
                      alt={path.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 45vw"
                      className="object-cover"
                      filename={path.image.split("/").pop()}
                    />
                  </div>

                  <p className="mt-6 font-medium text-accent tabular-nums">
                    {path.index}
                  </p>
                  <h3 className="mt-2 text-3xl tracking-[-0.03em] md:text-4xl">
                    {path.title}
                  </h3>
                  <p className="mt-2 italic text-ink/70">{path.italic}</p>
                  <p className="price mt-3">{path.priceHint}</p>
                </button>

                <ul
                  className={cn(
                    "mt-4 space-y-2 overflow-hidden text-sm text-ink/75 transition-all duration-500 md:max-h-40 md:opacity-100",
                    expanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0 md:mt-4"
                  )}
                  style={{ transitionTimingFunction: "var(--ease)" }}
                >
                  {path.bullets.map((b) => (
                    <li key={b} className="border-t border-ink/10 pt-2">
                      {b}
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {path.primary ? (
                    <Link href={path.href} className="btn-primary">
                      {path.cta}
                    </Link>
                  ) : (
                    <Link href={path.href} className="btn-outline">
                      {path.cta}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
