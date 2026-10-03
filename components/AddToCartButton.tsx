"use client";

import { useState } from "react";
import { useCartStore } from "@/store/cart";
import type { Product } from "@/data/products";
import { cn } from "@/lib/cn";

type Props = {
  product: Product;
  className?: string;
  label?: string;
};

export function AddToCartButton({
  product,
  className,
  label = "Add to cart",
}: Props) {
  const add = useCartStore((s) => s.add);
  const [qty, setQty] = useState(1);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-3">
        <span className="furniture text-grey">Qty</span>
        <div className="flex items-center border border-ink">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <span className="min-w-8 text-center tabular-nums">{qty}</span>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => q + 1)}
          >
            +
          </button>
        </div>
      </div>
      <button
        type="button"
        className="btn-primary w-full"
        onClick={() =>
          add(
            {
              slug: product.slug,
              name: product.name,
              price: product.price,
              image: product.images[0],
            },
            qty
          )
        }
      >
        {label}
      </button>
    </div>
  );
}
