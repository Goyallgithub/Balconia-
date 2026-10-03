import { getProducts, type Product } from "@/data/products";

export type RecommendInput = {
  size: "Small" | "Medium" | "Large";
  light: "full" | "partial" | "shade";
  style: "Minimal" | "Boho" | "Modern" | "Tropical" | "Festive";
  budget: number;
};

/**
 * Rule table the owner can edit later.
 * Priority: style tags → light adjustments → size constraints → budget trim.
 */
const STYLE_SEEDS: Record<RecommendInput["style"], string[]> = {
  Minimal: [
    "terracotta-planter-trio",
    "jhalar-string-light-curtain",
    "handwoven-jute-outdoor-rug",
  ],
  Boho: [
    "cane-rope-lounge-chair",
    "handwoven-jute-outdoor-rug",
    "terracotta-planter-trio",
    "brass-hanging-lantern",
  ],
  Modern: [
    "jhalar-string-light-curtain",
    "cane-rope-lounge-chair",
    "terracotta-planter-trio",
  ],
  Tropical: [
    "terracotta-planter-trio",
    "cane-rope-lounge-chair",
    "handwoven-jute-outdoor-rug",
    "jhalar-string-light-curtain",
  ],
  Festive: [
    "diwali-edit-box",
    "jhalar-string-light-curtain",
    "brass-hanging-lantern",
    "terracotta-planter-trio",
  ],
};

export function recommend(input: RecommendInput): Product[] {
  const catalog = getProducts();
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));
  const slugs = new Set(STYLE_SEEDS[input.style]);

  // Shade: lean into lighting, skip sun-heavy seating if budget is tight
  if (input.light === "shade") {
    slugs.add("jhalar-string-light-curtain");
    slugs.add("brass-hanging-lantern");
  }

  // Full sun: planters first
  if (input.light === "full") {
    slugs.add("terracotta-planter-trio");
  }

  // Small balconies: skip bulky chair unless budget allows
  if (input.size === "Small") {
    slugs.delete("cane-rope-lounge-chair");
    slugs.add("terracotta-planter-trio");
    slugs.add("jhalar-string-light-curtain");
  }

  // Large: include lounge if affordable
  if (input.size === "Large") {
    slugs.add("cane-rope-lounge-chair");
    slugs.add("handwoven-jute-outdoor-rug");
  }

  let picks = Array.from(slugs)
    .map((s) => bySlug.get(s))
    .filter((p): p is Product => Boolean(p));

  // Trim to budget, keep at least 3 if possible
  picks = picks.sort((a, b) => a.price - b.price);
  const selected: Product[] = [];
  let sum = 0;
  for (const p of picks) {
    if (selected.length >= 6) break;
    if (sum + p.price <= input.budget || selected.length < 3) {
      selected.push(p);
      sum += p.price;
    }
  }

  return selected.slice(0, 6);
}
