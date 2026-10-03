"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { SplitWords } from "@/components/SplitWords";
import { Jaali } from "@/components/Jaali";
import {
  CATEGORY_LABELS,
  getProducts,
  type ProductCategory,
} from "@/data/products";
import { isDiwaliActive } from "@/config/season";
import { cn } from "@/lib/cn";

type SortKey = "featured" | "price-asc" | "price-desc";

export default function ShopPage() {
  const all = getProducts();
  const diwali = isDiwaliActive();
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [sort, setSort] = useState<SortKey>("featured");

  const filtered = useMemo(() => {
    const list =
      category === "all" ? [...all] : all.filter((p) => p.category === category);
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => Number(b.featured) - Number(a.featured));
    return list;
  }, [all, category, sort]);

  const chips: Array<ProductCategory | "all"> = [
    "all",
    "planters",
    "lighting",
    "seating",
    "rugs-decor",
    ...(diwali ? (["diwali"] as const) : []),
  ];

  return (
    <div className="relative overflow-hidden bg-plaster pb-24">
      <Jaali className="text-ink opacity-[0.04]" opacity={0.04} />

      {diwali ? (
        <div className="relative border-b border-ink/10 bg-marigold px-4 py-3 md:px-8">
          <p className="furniture text-center text-ink">
            Diwali Edit is live · Use DIWALI10 for 10 percent off
          </p>
        </div>
      ) : null}

      <header className="relative mx-auto max-w-[1440px] px-4 py-12 md:px-8 md:py-16">
        <p className="furniture text-grey" data-rev>
          Shop
        </p>
        <SplitWords
          as="h1"
          className="display mt-3 text-[clamp(2.5rem,8vw,5rem)] tracking-[-0.05em]"
          text="Pieces for your balcony"
        />
        <p
          className="mt-4 max-w-lg text-ink/70"
          data-rev
          style={{ ["--d" as string]: 120 }}
        >
          Lighting, planters, seating, and festive edits. Ship across India.
          Free shipping above ₹1,999.
        </p>
      </header>

      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between md:px-8">
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
          role="tablist"
          aria-label="Categories"
        >
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={category === c}
              className={cn(
                "furniture shrink-0 border px-3 py-2 transition-colors duration-300",
                category === c
                  ? "border-ink bg-ink text-plaster"
                  : "border-ink/25 text-ink"
              )}
              style={{ transitionTimingFunction: "var(--ease)", minHeight: 44 }}
              onClick={() => setCategory(c)}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        <label className="furniture flex items-center gap-2 text-grey">
          Sort
          <select
            className="border border-ink/25 bg-plaster px-3 py-2 text-ink"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            style={{ minHeight: 44 }}
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price low to high</option>
            <option value="price-desc">Price high to low</option>
          </select>
        </label>
      </div>

      <div className="relative mx-auto mt-10 grid max-w-[1440px] grid-cols-2 gap-4 px-4 md:grid-cols-4 md:gap-6 md:px-8">
        {filtered.map((p, i) => (
          <ProductCard key={p.slug} product={p} index={i} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-20 text-center text-ink/60 md:px-8">
          No pieces in this filter yet.{" "}
          <Link href="/shop" className="text-accent">
            Clear filters
          </Link>
        </p>
      ) : null}
    </div>
  );
}
