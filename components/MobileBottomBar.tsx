"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { whatsappLink } from "@/lib/whatsapp";
import { useCartStore } from "@/store/cart";

/**
 * Sticky mobile bottom bar after hero on the homepage only.
 * Hidden on shop/product/checkout so it never covers Add / Pay actions.
 */
export function MobileBottomBar() {
  const pathname = usePathname();
  const cartOpen = useCartStore((s) => s.isOpen);
  const [show, setShow] = useState(false);
  const wa = whatsappLink(
    "Hi Balconia, I would like to talk about a balcony makeover."
  );

  const onHome = pathname === "/";

  useEffect(() => {
    if (!onHome) {
      setShow(false);
      return;
    }
    const onScroll = () => {
      const threshold = window.innerHeight * 0.85;
      setShow(window.scrollY > threshold);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onHome]);

  if (!onHome) return null;

  const visible = show && !cartOpen;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-plaster px-3 pt-2 md:hidden ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-full opacity-0"
      }`}
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        transition: "transform 0.45s var(--ease), opacity 0.45s var(--ease)",
      }}
    >
      <div className="flex items-center gap-2">
        <Link href="/book" className="btn-primary flex-1 text-center">
          Book a makeover
        </Link>
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 w-12 shrink-0 items-center justify-center border border-ink text-ink"
          aria-label="Chat on WhatsApp"
        >
          <WhatsAppIcon />
        </a>
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.2 C7.3 3.2 3.5 6.9 3.5 11.5 C3.5 13.1 4 14.6 4.9 15.9 L3.7 20.3 L8.3 19.1 C9.5 19.8 10.7 20.2 12 20.2 C16.7 20.2 20.5 16.5 20.5 11.9 C20.5 7.3 16.7 3.2 12 3.2 Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M9.2 9.4 C9.4 9 9.6 8.9 9.8 8.9 H10.2 C10.4 8.9 10.5 9 10.6 9.3 L11.1 10.5 C11.2 10.7 11.1 10.9 11 11.1 L10.7 11.4 C10.6 11.5 10.6 11.7 10.7 11.8 C11 12.3 11.6 12.9 12.2 13.3 C12.4 13.4 12.5 13.4 12.7 13.3 L13.2 12.9 C13.4 12.8 13.6 12.8 13.8 12.9 L15.1 13.6 C15.4 13.8 15.5 14 15.4 14.3 C15.2 15.1 14.5 15.6 13.7 15.6 C11.2 15.6 9.1 13.4 9.1 10.9 V10.5 C9.1 10.1 9.1 9.7 9.2 9.4 Z"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}
