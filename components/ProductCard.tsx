"use client";

import Link from "next/link";
import { SoftImage } from "@/components/SoftImage";
import { formatINR } from "@/lib/format";
import { useCartStore } from "@/store/cart";
import type { Product } from "@/data/products";
import { cn } from "@/lib/cn";

type Props = {
  product: Product;
  index?: number;
  className?: string;
  priority?: boolean;
};

export function ProductCard({ product, index = 0, className, priority }: Props) {
  const add = useCartStore((s) => s.add);
  const second = product.images[1] || product.images[0];

  return (
    <article
      className={cn("group relative flex flex-col", className)}
      data-rev
      style={{ ["--d" as string]: 40 + (index % 8) * 50 }}
    >
      <Link
        href={`/shop/${product.slug}`}
        className="relative block aspect-[4/5] overflow-hidden bg-paper-2"
      >
        <SoftImage
          src={product.images[0]}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 78vw, 25vw"
          className="object-cover transition-opacity duration-700 group-hover:opacity-0"
          style={{ transitionTimingFunction: "var(--ease)" }}
          priority={priority}
          filename={`${product.slug}-1.jpg`}
        />
        <SoftImage
          src={second}
          alt=""
          fill
          sizes="(max-width: 768px) 78vw, 25vw"
          className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          style={{ transitionTimingFunction: "var(--ease)" }}
          filename={`${product.slug}-2.jpg`}
        />
        {product.isDiwali ? (
          <span className="furniture absolute left-3 top-3 bg-marigold px-2 py-1 text-ink">
            Diwali Edit
          </span>
        ) : null}
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/shop/${product.slug}`}
            className="tap-inline block tracking-[-0.02em] transition-opacity hover:opacity-70"
          >
            {product.name}
          </Link>
          <p className="price mt-1 text-sm">
            {formatINR(product.price)}
            {product.compareAtPrice ? (
              <span className="ml-2 text-grey line-through">
                {formatINR(product.compareAtPrice)}
              </span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          className="furniture shrink-0 border border-ink px-3 py-2 text-ink transition-colors duration-300 hover:bg-ink hover:text-plaster"
          style={{ transitionTimingFunction: "var(--ease)", minHeight: 44 }}
          onClick={() =>
            add({
              slug: product.slug,
              name: product.name,
              price: product.price,
              image: product.images[0],
            })
          }
        >
          Add
        </button>
      </div>
    </article>
  );
}
