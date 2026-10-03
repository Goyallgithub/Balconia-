import Link from "next/link";
import { Jaali } from "@/components/Jaali";
import { whatsappLink } from "@/lib/whatsapp";

const FOOTER_LINKS = [
  { href: "/gallery", label: "Gallery" },
  { href: "/shop", label: "Shop" },
  { href: "/book", label: "Book a makeover" },
  { href: "/diy", label: "DIY list" },
  { href: "/faq", label: "FAQ" },
] as const;

export function Footer() {
  const wa = whatsappLink("Hi Balconia, I have a question about a balcony makeover.");

  return (
    <footer className="band relative overflow-hidden bg-night text-plaster">
      <Jaali className="text-plaster" opacity={0.06} />

      <div className="relative mx-auto max-w-[1440px] px-4 py-12 md:px-8 md:py-16">
        <div className="flex flex-wrap items-baseline gap-3" data-rev style={{ ["--d" as string]: 0 }}>
          <p className="display text-[clamp(3rem,14vw,7rem)] tracking-[-0.05em]">Balconia</p>
          <span className="font-hindi text-[10.5px] text-plaster/70" lang="hi">
            बालकनी
          </span>
        </div>

        <nav
          className="mt-10 flex flex-col gap-3 md:mt-14 md:flex-row md:flex-wrap md:gap-x-10 md:gap-y-3"
          aria-label="Footer"
        >
          {FOOTER_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className="furniture tap-inline text-plaster/80 transition-colors duration-300 hover:text-plaster"
              style={{ transitionTimingFunction: "var(--ease)", ["--d" as string]: 40 + i * 50 }}
              data-rev
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-12 flex flex-col gap-3 border-t border-plaster/15 pt-10 md:flex-row md:flex-wrap md:gap-x-10">
          <a
            href="https://instagram.com/balconia.in"
            target="_blank"
            rel="noopener noreferrer"
            className="furniture tap-inline text-plaster/80"
            data-rev
            style={{ ["--d" as string]: 280 }}
          >
            Instagram
          </a>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="furniture tap-inline text-plaster/80"
            data-rev
            style={{ ["--d" as string]: 330 }}
          >
            WhatsApp
          </a>
          <a
            href="mailto:hello@balconia.in"
            className="furniture tap-inline text-plaster/80"
            data-rev
            style={{ ["--d" as string]: 380 }}
          >
            hello@balconia.in
          </a>
        </div>

        <p
          className="furniture mt-10 text-plaster/45"
          data-rev
          style={{ ["--d" as string]: 420 }}
        >
          GSTIN: XXAAAAA0000A1Z5 · Legal placeholder
        </p>
        <p
          className="furniture mt-3 text-plaster/45"
          data-rev
          style={{ ["--d" as string]: 460 }}
        >
          Made in India
        </p>
      </div>
    </footer>
  );
}
