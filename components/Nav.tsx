"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/gallery", label: "Gallery" },
  { href: "/shop", label: "Shop" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/book", label: "Book" },
  { href: "/faq", label: "FAQ" },
] as const;

export function Nav() {
  const pathname = usePathname();
  const count = useCartStore((s) => s.lines.reduce((n, l) => n + l.qty, 0));
  const openCart = useCartStore((s) => s.open);
  const closeCart = useCartStore((s) => s.close);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function go(href: string) {
    closeCart();
    setMenuOpen(false);

    if (href.startsWith("/#")) {
      const id = href.slice(2);
      if (pathname !== "/") {
        window.location.assign(`/#${id}`);
        return;
      }
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // Hard navigation is reliable with Lenis + overlay chrome
    window.location.assign(href);
  }

  return (
    <>
      <header
        className="sticky z-[100] isolate border-b border-ink/10 bg-plaster"
        style={{ top: "var(--ribbon-h, 0px)" }}
      >
        <nav
          className="relative mx-auto grid h-12 max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center px-4 md:h-14 md:px-8"
          aria-label="Primary"
        >
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault();
              go("/");
            }}
            className="display justify-self-start py-1 text-[1.25rem] tracking-[-0.04em] text-ink md:text-[1.4rem]"
            style={{ minHeight: 0, minWidth: 0 }}
          >
            Balconia
          </Link>

          <ul className="hidden items-center gap-7 md:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    go(link.href);
                  }}
                  className="furniture block py-2 text-ink/75 transition-colors duration-300 hover:text-ink"
                  style={{
                    minHeight: 0,
                    minWidth: 0,
                    transitionTimingFunction: "var(--ease)",
                  }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-end gap-1 justify-self-end">
            <button
              type="button"
              onClick={openCart}
              className="relative flex h-11 w-11 items-center justify-center"
              aria-label={`Cart, ${count} items`}
            >
              <CartIcon />
              {count > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center bg-accent px-1 text-[9px] font-medium tabular-nums text-plaster">
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center md:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => {
                closeCart();
                setMenuOpen((v) => !v);
              }}
            >
              <span className="sr-only">Menu</span>
              <span className="relative block h-3 w-5" aria-hidden>
                <span
                  className={cn(
                    "absolute left-0 top-0 h-px w-full bg-ink transition-transform duration-300",
                    menuOpen && "top-1.5 rotate-45"
                  )}
                  style={{ transitionTimingFunction: "var(--ease)" }}
                />
                <span
                  className={cn(
                    "absolute left-0 top-1.5 h-px w-full bg-ink transition-opacity duration-300",
                    menuOpen && "opacity-0"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 top-3 h-px w-full bg-ink transition-transform duration-300",
                    menuOpen && "top-1.5 -rotate-45"
                  )}
                  style={{ transitionTimingFunction: "var(--ease)" }}
                />
              </span>
            </button>
          </div>
        </nav>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-[110] flex flex-col bg-plaster transition-[opacity,visibility] duration-500 md:hidden",
          menuOpen
            ? "visible opacity-100"
            : "invisible pointer-events-none opacity-0"
        )}
        style={{
          transitionTimingFunction: "var(--ease)",
          paddingTop: "calc(var(--ribbon-h, 0px) + 3rem)",
        }}
        aria-hidden={!menuOpen}
      >
        <ul className="flex flex-1 flex-col justify-center gap-1 px-6 pb-24">
          {LINKS.map((link, i) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "display block py-3 text-[11vw] leading-none tracking-[-0.04em] text-ink transition-all duration-700",
                  menuOpen
                    ? "translate-y-0 opacity-100"
                    : "translate-y-6 opacity-0"
                )}
                style={{
                  minHeight: 0,
                  transitionTimingFunction: "var(--ease)",
                  transitionDelay: menuOpen ? `${80 + i * 70}ms` : "0ms",
                }}
                onClick={(e) => {
                  e.preventDefault();
                  go(link.href);
                }}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/shop"
              className="btn-primary mt-6 inline-flex"
              onClick={(e) => {
                e.preventDefault();
                go("/shop");
              }}
            >
              Shop now
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M3 4.5 H5 L6.5 13.5 H15.5 L17 6.5 H6"
        stroke="currentColor"
        strokeWidth="1"
      />
      <circle cx="8" cy="16.5" r="1" stroke="currentColor" strokeWidth="1" />
      <circle cx="14.5" cy="16.5" r="1" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
