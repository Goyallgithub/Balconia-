"use client";

import { whatsappLink } from "@/lib/whatsapp";

/** Floating WhatsApp, desktop only. Mobile uses the bottom bar. */
export function DesktopWhatsApp() {
  const wa = whatsappLink("Hi Balconia, I would like to talk about a balcony makeover.");

  return (
    <a
      href={wa}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 hidden h-14 w-14 items-center justify-center border border-ink bg-plaster text-ink transition-opacity duration-300 hover:opacity-90 md:flex"
      style={{ transitionTimingFunction: "var(--ease)" }}
      aria-label="Chat on WhatsApp"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    </a>
  );
}
