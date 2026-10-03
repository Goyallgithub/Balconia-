import type { CSSProperties } from "react";
import { SplitWords } from "@/components/SplitWords";

const COLUMNS = [
  {
    label: "See it first",
    body: "We share a mood board and item list before you pay, so the look is clear.",
  },
  {
    label: "Made in India",
    body: "Planters, lighting, and textiles from local artisans and makers.",
  },
  {
    label: "Done or DIY",
    body: "We install the full makeover, or you shop our curated list yourself.",
  },
] as const;

export function IntroBand() {
  return (
    <section className="band bg-haldi px-4 py-12 md:px-8 md:py-16" aria-labelledby="intro-heading">
      <div className="mx-auto max-w-[1100px]">
        <h2 id="intro-heading" className="sr-only">
          Every balcony has a better version of itself
        </h2>
        <SplitWords
          as="p"
          className="display text-[clamp(2rem,7vw,4.25rem)] tracking-[-0.045em]"
          text="Every balcony has a better version of itself."
        />
        <p
          className="font-caveat mt-5 text-[clamp(1.5rem,4vw,2.25rem)] text-accent"
          data-rev
          style={
            {
              transform: "rotate(1.5deg)",
              transformOrigin: "left center",
              ["--d"]: 160,
            } as CSSProperties
          }
        >
          we just find it
        </p>

        <div className="mt-8 grid gap-8 border-t border-ink/15 pt-8 md:grid-cols-3 md:gap-8">
          {COLUMNS.map((col, i) => (
            <div
              key={col.label}
              data-rev
              style={{ ["--d" as string]: 80 + i * 70 }}
            >
              <p className="text-lg font-medium tracking-[-0.02em]">{col.label}</p>
              <p className="mt-3 text-sm leading-relaxed text-ink/75">{col.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
