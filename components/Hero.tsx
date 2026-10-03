import Link from "next/link";
import { Toran } from "@/components/Toran";

/**
 * First viewport: full-bleed balcony photo + solid plaster type band.
 * Text never sits on foliage — always readable.
 */
export function Hero() {
  return (
    <>
      <section className="relative bg-plaster" aria-label="Hero">
        {/* Photo — edge to edge under the nav */}
        <div
          role="img"
          aria-label="Warm natural-light Indian balcony with plants and cane seating"
          className="relative w-full"
          style={{
            height: "min(48svh, 420px)",
            minHeight: 220,
            backgroundColor: "#2a241c",
            backgroundImage: "url(/photos/hero-still.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center 42%",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* Solid type band */}
        <div className="relative z-10 border-t border-ink/15 bg-plaster px-4 pb-6 pt-4 md:px-8 md:pb-8 md:pt-6">
          <div className="mx-auto max-w-[1440px]">
            <p
              className="font-caveat text-[clamp(1.35rem,3.5vw,1.85rem)] text-accent"
              style={{
                transform: "rotate(-1.5deg)",
                transformOrigin: "left center",
              }}
            >
              ghar ka sabse sundar kona
            </p>

            <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
              <h1
                className="display text-ink"
                style={{
                  fontSize:
                    "min(clamp(2.75rem, 10vw, 5.75rem), calc(90vw / (8 * 0.55)))",
                  lineHeight: 0.9,
                  letterSpacing: "-0.045em",
                  whiteSpace: "nowrap",
                }}
              >
                Balconia
              </h1>
              <span
                className="font-hindi mb-1 text-[10.5px] text-ink/55"
                lang="hi"
              >
                बालकनी
              </span>
            </div>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/80 md:text-[0.95rem]">
              Before and after balcony makeovers, and a curated shop of lighting,
              planters and seating, shipped across India.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href="/shop" className="btn-primary">
                Shop decor
              </Link>
              <Link href="/book" className="btn-outline">
                Book a makeover
              </Link>
            </div>

            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1 border-t border-ink/10 pt-4">
              {[
                "Before and after",
                "Design + decor, delivered",
                "Pan India shipping",
              ].map((label) => (
                <li
                  key={label}
                  className="furniture text-[10.5px] uppercase tracking-[0.16em] text-ink/50"
                >
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <Toran />
    </>
  );
}
