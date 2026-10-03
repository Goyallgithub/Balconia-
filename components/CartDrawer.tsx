"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { Diya } from "@/components/Diya";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Cart drawer: opens from nav / Add; traps focus; Esc closes.
 * Closes on route change so it never covers checkout.
 */
export function CartDrawer() {
  const pathname = usePathname();
  const isOpen = useCartStore((s) => s.isOpen);
  const close = useCartStore((s) => s.close);
  const lines = useCartStore((s) => s.lines);
  const subtotal = useCartStore((s) => s.subtotal());
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);

    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(
      'a, button, input, [tabindex]:not([tabindex="-1"])'
    );
    focusables?.[0]?.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", trap);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", trap);
    };
  }, [isOpen, close]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[80] bg-ink/40 transition-opacity duration-400",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        style={{ transitionTimingFunction: "var(--ease)" }}
        onClick={close}
        aria-hidden
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal={isOpen}
        aria-label="Cart"
        className={cn(
          "fixed z-[90] flex flex-col bg-plaster transition-transform duration-500",
          "inset-x-0 bottom-0 max-h-[85svh] border-t border-ink/15 md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-h-none md:w-[min(420px,100vw)] md:border-l md:border-t-0",
          isOpen
            ? "translate-y-0 md:translate-x-0"
            : "pointer-events-none translate-y-full md:translate-y-0 md:translate-x-full"
        )}
        style={{ transitionTimingFunction: "var(--ease)" }}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <p className="furniture">Your cart</p>
          <button type="button" onClick={close} className="furniture tap-inline px-2" aria-label="Close cart">
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-8">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <Diya size={56} className="text-accent" />
              <p className="text-lg tracking-[-0.03em]">Your cart is empty</p>
              <p className="furniture text-grey">Add a piece from the shop</p>
              <Link href="/shop" onClick={close} className="btn-outline mt-4">
                Browse shop
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {lines.map((line) => (
                <li key={line.slug} className="flex justify-between gap-4 border-b border-ink/10 pb-4">
                  <div>
                    <p className="tracking-[-0.02em]">{line.name}</p>
                    <p className="furniture mt-1 text-grey">Qty {line.qty}</p>
                  </div>
                  <p className="price">{formatINR(line.price * line.qty)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 ? (
          <div className="border-t border-ink/10 px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="mb-4 flex justify-between">
              <span className="furniture">Subtotal</span>
              <span className="price text-lg">{formatINR(subtotal)}</span>
            </div>
            <Link href="/cart" onClick={close} className="btn-primary w-full text-center">
              View cart
            </Link>
          </div>
        ) : null}
      </aside>
    </>
  );
}
