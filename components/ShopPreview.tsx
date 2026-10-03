import type { CSSProperties } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { SplitWords } from "@/components/SplitWords";
import { Jaali } from "@/components/Jaali";
import type { Product } from "@/data/products";

type Props = {
  products: Product[];
};

export function ShopPreview({ products }: Props) {
  return (
    <section
      className="band relative overflow-hidden bg-paper px-0 py-12 md:py-16"
      aria-labelledby="shop-preview-heading"
    >
      <Jaali className="text-ink" opacity={0.05} />
      <div className="relative">
        <div className="mb-8 flex items-end justify-between gap-4 px-4 md:px-8">
          <div>
            <p className="furniture text-grey" data-rev>
              Shop
            </p>
            <SplitWords
              as="h2"
              id="shop-preview-heading"
              className="display mt-3 text-[clamp(2rem,6vw,3.5rem)] tracking-[-0.04em]"
              text="Make it yours"
            />
          </div>
          <Link
            href="/shop"
            className="furniture tap-inline hidden text-accent sm:inline"
            data-rev
          >
            View all
          </Link>
        </div>

        <div
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {products.map((p, i) => (
            <ProductCard
              key={p.slug}
              product={p}
              index={i}
              className="w-[78vw] shrink-0 snap-center"
              priority={i === 0}
            />
          ))}
          <Link
            href="/shop"
            className="flex w-[60vw] shrink-0 snap-center flex-col justify-between border border-ink/20 bg-plaster p-5"
            data-rev
          >
            <span className="furniture text-grey">Catalog</span>
            <span className="display text-2xl tracking-[-0.03em]">
              View all pieces
            </span>
            <span className="furniture text-accent">Shop →</span>
          </Link>
        </div>

        <div className="mx-auto hidden max-w-[1440px] grid-cols-4 gap-6 px-8 md:grid lg:grid-cols-3 xl:grid-cols-4">
          {products.slice(0, 5).map((p, i) => (
            <ProductCard key={p.slug} product={p} index={i} priority={i < 2} />
          ))}
          <Link
            href="/shop"
            className="flex aspect-[4/5] flex-col justify-between border border-ink/20 bg-plaster p-6 transition-colors duration-300 hover:bg-ink hover:text-plaster"
            data-rev
            style={
              {
                transitionTimingFunction: "var(--ease)",
                ["--d"]: 280,
              } as CSSProperties
            }
          >
            <span className="furniture opacity-70">Catalog</span>
            <span className="display text-3xl tracking-[-0.03em]">View all</span>
            <span className="furniture">Shop →</span>
          </Link>
        </div>

        <div className="mt-8 px-4 md:hidden">
          <Link href="/shop" className="btn-outline w-full text-center">
            View all products
          </Link>
        </div>
      </div>
    </section>
  );
}
