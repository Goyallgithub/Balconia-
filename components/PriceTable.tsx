import { SplitWords } from "@/components/SplitWords";
import { getServices } from "@/data/services";
import { formatINR } from "@/lib/format";

export function PriceTable() {
  const services = getServices();

  return (
    <section
      className="band bg-paper px-4 py-12 md:px-8 md:py-16"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-[900px]">
        <SplitWords
          as="h2"
          id="pricing-heading"
          className="display text-[clamp(1.75rem,5vw,3rem)] tracking-[-0.04em]"
          text="Makeover packages"
        />

        <ul className="mt-10">
          {services.map((s, i) => (
            <li
              key={s.slug}
              className="grid grid-cols-1 gap-2 border-t border-ink/15 py-5 sm:grid-cols-[1fr_1.2fr_auto] sm:items-baseline sm:gap-6"
              data-rev
              style={{ ["--d" as string]: 40 + i * 55 }}
            >
              <span className="font-medium tracking-[-0.02em]">{s.name}</span>
              <span className="italic text-ink/65">{s.description}</span>
              <span className="price text-lg">{formatINR(s.priceFrom)}</span>
            </li>
          ))}
        </ul>
        <p
          className="mt-6 text-sm text-ink/60"
          data-rev
          style={{ ["--d" as string]: 280 }}
        >
          Prices are starting points. Final quote after your free photo review.
        </p>
      </div>
    </section>
  );
}
