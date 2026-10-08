"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { SplitWords } from "@/components/SplitWords";
import { Jaali } from "@/components/Jaali";
import {
  CATEGORY_LABELS,
  PLANT_SUBCATEGORY_LABELS,
  getProducts,
  type PlantSubcategory,
  type ProductCategory,
} from "@/data/products";
import { cn } from "@/lib/cn";

type SortKey = "featured" | "price-asc" | "price-desc";

const CATEGORIES: Array<ProductCategory | "all"> = [
  "all",
  "plants",
  "pots",
  "lights",
  "decor",
  "gifting",
];

const PLANT_SUBS: Array<PlantSubcategory | "all"> = [
  "all",
  "anti-pollution",
  "herbs",
  "flowers",
  "seasonal",
  "exotic",
];

export default function ShopPage() {
  const all = getProducts();
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [plantSub, setPlantSub] = useState<PlantSubcategory | "all">("all");
  const [sort, setSort] = useState<SortKey>("featured");

  const filtered = useMemo(() => {
    let list = [...all];
    if (category !== "all") {
      list = list.filter((p) => p.category === category);
    }
    if (category === "plants" && plantSub !== "all") {
      list = list.filter((p) => p.subcategory === plantSub);
    }
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else list.sort((a, b) => Number(b.featured) - Number(a.featured));
    return list;
  }, [all, category, plantSub, sort]);

  return (
    <div className="relative overflow-hidden bg-plaster pb-24">
      <Jaali className="text-ink opacity-[0.04]" opacity={0.04} />

      <header className="relative mx-auto max-w-[1440px] px-4 py-12 md:px-8 md:py-16">
        <p className="furniture text-grey" data-rev>
          Shop
        </p>
        <SplitWords
          as="h1"
          className="display mt-3 text-[clamp(2.5rem,8vw,5rem)] tracking-[-0.05em]"
          text="Catalogue"
        />
        <p
          className="mt-4 max-w-lg text-ink/70"
          data-rev
          style={{ ["--d" as string]: 120 }}
        >
          Plants, pots, lights, decor and gifting — curated for Indian balconies.
          Free shipping above ₹1,999.
        </p>
      </header>

      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-4 px-4 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none" }}
            role="tablist"
            aria-label="Categories"
          >
            {CATEGORIES.map((c) => (
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
                onClick={() => {
                  setCategory(c);
                  if (c !== "plants") setPlantSub("all");
                }}
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

        {category === "plants" ? (
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none" }}
            role="tablist"
            aria-label="Plant types"
          >
            {PLANT_SUBS.map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={plantSub === s}
                className={cn(
                  "furniture shrink-0 border px-3 py-2 transition-colors duration-300",
                  plantSub === s
                    ? "border-accent bg-accent text-plaster"
                    : "border-ink/20 text-ink/80"
                )}
                style={{ transitionTimingFunction: "var(--ease)", minHeight: 44 }}
                onClick={() => setPlantSub(s)}
              >
                {PLANT_SUBCATEGORY_LABELS[s]}
              </button>
            ))}
          </div>
        ) : null}

        <p className="furniture text-grey">
          {filtered.length} {filtered.length === 1 ? "product" : "products"}
        </p>
      </div>

      <div className="relative mx-auto mt-8 grid max-w-[1440px] grid-cols-2 gap-4 px-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 md:px-8">
        {filtered.map((p, i) => (
          <ProductCard key={p.slug} product={p} index={i} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-20 text-center text-ink/60 md:px-8">
          Nothing in this filter yet.{" "}
          <button
            type="button"
            className="text-accent"
            onClick={() => {
              setCategory("all");
              setPlantSub("all");
            }}
          >
            Clear filters
          </button>
        </p>
      ) : null}
    </div>
  );
}
