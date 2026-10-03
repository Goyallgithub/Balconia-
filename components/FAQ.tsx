import { SplitWords } from "@/components/SplitWords";

const FAQS = [
  {
    q: "Which cities do you serve?",
    a: "Full installation currently covers Delhi NCR, Mumbai, Bengaluru, Hyderabad, Pune, and Chandigarh. The shop and DIY lists ship pan India.",
  },
  {
    q: "How long does a makeover take?",
    a: "Most Signature makeovers go from brief to install in about a week once you approve the mood board. Smaller refreshes can finish in a long weekend.",
  },
  {
    q: "Can I buy only the products?",
    a: "Yes. The shop is open to everyone. Use the DIY quiz if you want a ready bundle, or browse piece by piece.",
  },
  {
    q: "What if my balcony is very small?",
    a: "We design plenty of under-30 sq ft spaces. Think vertical planters, foldable seating, and lighting that reads larger after dark.",
  },
  {
    q: "Do you ship across India?",
    a: "Yes. Decor items ship pan India. Free shipping unlocks above ₹1,999 on shop orders.",
  },
  {
    q: "What is your return policy?",
    a: "Unused items in original packaging can be returned within 7 days. Custom carpentry and installed work are non-returnable.",
  },
  {
    q: "Do you take care of installation of lights and planters?",
    a: "Yes on Book a makeover packages. DIY shoppers get simple install notes with each kit.",
  },
  {
    q: "What payment options do you accept?",
    a: "Shop orders are UPI only. Pay to our UPI ID at checkout, then share the transaction reference. We confirm on WhatsApp before shipping.",
  },
] as const;

export function FAQ() {
  return (
    <section
      id="faq"
      className="band bg-plaster px-4 py-12 md:px-8 md:py-16"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-[800px]">
        <p className="furniture text-grey" data-rev>
          FAQ
        </p>
        <SplitWords
          as="h1"
          id="faq-heading"
          className="display mt-3 text-[clamp(2.25rem,7vw,4.5rem)] tracking-[-0.05em]"
          text="Questions, answered"
        />

        <div className="mt-10 divide-y divide-ink/15 border-y border-ink/15">
          {FAQS.map((item, i) => (
            <details
              key={item.q}
              className="group py-1"
              data-rev
              style={{ ["--d" as string]: 40 + i * 40 }}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-lg tracking-[-0.02em] [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                <span
                  className="relative h-4 w-4 shrink-0"
                  aria-hidden
                >
                  <span className="absolute left-0 top-1/2 h-px w-full bg-ink transition-transform duration-300 group-open:rotate-90" />
                  <span className="absolute left-0 top-1/2 h-px w-full rotate-90 bg-ink transition-transform duration-300 group-open:rotate-180" />
                </span>
              </summary>
              <p className="pb-5 pr-8 text-sm leading-relaxed text-ink/70">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
