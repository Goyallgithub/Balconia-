import { SplitWords } from "@/components/SplitWords";

/* TODO replace with real reviews */
const QUOTES = [
  {
    text: "They turned our pigeon perch into the place we actually sit after work.",
    name: "Ananya R.",
    city: "Gurgaon",
  },
  {
    text: "The DIY list was spot on for a 4 by 8 balcony. Lights arrived in three days.",
    name: "Kabir M.",
    city: "Bengaluru",
  },
  {
    text: "Diwali guests thought we had always had a garden lounge. We did not.",
    name: "Meher S.",
    city: "Mumbai",
  },
] as const;

export function Testimonials() {
  return (
    <section
      className="band bg-haldi px-0 py-12 md:py-16"
      aria-labelledby="testimonials-heading"
    >
      <div className="px-4 md:px-8">
        <SplitWords
          as="h2"
          id="testimonials-heading"
          className="display text-[clamp(1.75rem,5vw,3rem)] tracking-[-0.04em]"
          text="From other balconies"
        />
      </div>

      <div
        className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-auto md:max-w-[1200px] md:grid md:grid-cols-3 md:gap-8 md:overflow-visible md:px-8"
        style={{ scrollbarWidth: "none" }}
      >
        {QUOTES.map((q, i) => (
          <blockquote
            key={q.name}
            className="w-[85vw] shrink-0 snap-center border-t border-ink/20 pt-6 md:w-auto"
            data-rev
            style={{ ["--d" as string]: 50 + i * 70 }}
          >
            <p className="text-[clamp(1.35rem,3vw,1.75rem)] italic leading-snug tracking-[-0.02em]">
              “{q.text}”
            </p>
            <footer className="furniture mt-6 text-grey">
              {q.name} · {q.city}
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
