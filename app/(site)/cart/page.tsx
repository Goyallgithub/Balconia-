"use client";

import Link from "next/link";
import { SoftImage } from "@/components/SoftImage";
import { Diya } from "@/components/Diya";
import { useCartStore } from "@/store/cart";
import { formatINR } from "@/lib/format";
import { isDiwaliActive } from "@/config/season";

const FREE_SHIPPING_AT = 1999;

export default function CartPage() {
  const lines = useCartStore((s) => s.lines);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const coupon = useCartStore((s) => s.coupon);
  const setCoupon = useCartStore((s) => s.setCoupon);
  const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
  const diwali = isDiwaliActive();
  const discount =
    diwali && coupon?.toUpperCase() === "DIWALI10"
      ? Math.round(subtotal * 0.1)
      : 0;
  const total = subtotal - discount;
  const shipGap = Math.max(0, FREE_SHIPPING_AT - subtotal);

  if (lines.length === 0) {
    return (
      <div className="flex min-h-[70svh] flex-col items-center justify-center px-4 py-20 text-center">
        <Diya size={64} className="text-accent" />
        <h1 className="display mt-6 text-4xl tracking-[-0.04em]">
          Your cart is empty
        </h1>
        <p className="furniture mt-3 text-grey">Start with a piece from the shop</p>
        <Link href="/shop" className="btn-primary mt-8">
          Browse shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1000px] gap-12 px-4 py-12 pb-28 md:grid-cols-[1.4fr_1fr] md:px-8 md:py-16">
      <div>
        <h1 className="display text-4xl tracking-[-0.04em]">Cart</h1>
        <ul className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
          {lines.map((line) => (
            <li key={line.slug} className="flex gap-4 py-5">
              <div className="relative h-24 w-20 shrink-0 bg-paper-2">
                <SoftImage
                  src={line.image}
                  alt={line.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <Link href={`/shop/${line.slug}`} className="tracking-[-0.02em]">
                    {line.name}
                  </Link>
                  <p className="price">{formatINR(line.price * line.qty)}</p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center border border-ink">
                    <button
                      type="button"
                      className="h-10 w-10"
                      aria-label="Decrease"
                      onClick={() => setQty(line.slug, line.qty - 1)}
                    >
                      −
                    </button>
                    <span className="min-w-6 text-center tabular-nums">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      className="h-10 w-10"
                      aria-label="Increase"
                      onClick={() => setQty(line.slug, line.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="furniture text-grey"
                    onClick={() => remove(line.slug)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="h-fit border border-ink/15 bg-paper p-6">
        <p className="furniture">Summary</p>
        {shipGap > 0 ? (
          <p className="mt-4 text-sm text-ink/70">
            Add <span className="price">{formatINR(shipGap)}</span> more for free
            shipping
          </p>
        ) : (
          <p className="mt-4 text-sm text-accent">You unlocked free shipping</p>
        )}
        <div className="mt-3 h-1 w-full bg-paper-2">
          <div
            className="h-full bg-accent"
            style={{
              width: `${Math.min(100, (subtotal / FREE_SHIPPING_AT) * 100)}%`,
            }}
          />
        </div>

        {diwali ? (
          <label className="mt-6 block">
            <span className="furniture text-grey">Coupon</span>
            <input
              className="mt-2 w-full border border-ink/25 bg-plaster px-3 py-3"
              placeholder="DIWALI10"
              value={coupon ?? ""}
              onChange={(e) => setCoupon(e.target.value || null)}
            />
          </label>
        ) : null}

        <div className="mt-6 space-y-2 border-t border-ink/10 pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatINR(subtotal)}</span>
          </div>
          {discount > 0 ? (
            <div className="flex justify-between text-accent">
              <span>DIWALI10</span>
              <span>−{formatINR(discount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-lg">
            <span className="font-medium">Total</span>
            <span className="price">{formatINR(total)}</span>
          </div>
        </div>

        <Link href="/checkout" className="btn-primary mt-6 w-full text-center">
          Checkout
        </Link>
      </aside>
    </div>
  );
}
