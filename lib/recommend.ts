import {
  getProducts,
  type Product,
  type ProductCategory,
} from "@/data/products";

export type RecommendInput = {
  size: "Small" | "Medium" | "Large";
  light: "full" | "partial" | "shade";
  style: "Minimal" | "Boho" | "Modern" | "Tropical" | "Festive";
  budget: number;
};

function pickByCategory(
  catalog: Product[],
  category: ProductCategory,
  limit: number,
  prefer?: (p: Product) => boolean
): Product[] {
  const list = catalog.filter((p) => p.category === category);
  const preferred = prefer ? list.filter(prefer) : [];
  const rest = list.filter((p) => !preferred.includes(p));
  return [...preferred, ...rest].slice(0, limit);
}

/**
 * Rule-based DIY bundle from the live catalogue.
 */
export function recommend(input: RecommendInput): Product[] {
  const catalog = getProducts();
  const picks: Product[] = [];

  const plantPrefer =
    input.light === "shade"
      ? (p: Product) =>
          p.subcategory === "anti-pollution" ||
          /peace|snake|aglaonema|money|fern/i.test(p.name)
      : input.style === "Tropical"
        ? (p: Product) =>
            p.subcategory === "exotic" || /palm|bird|areca|banana/i.test(p.name)
        : input.style === "Festive"
          ? (p: Product) =>
              p.subcategory === "flowers" || p.subcategory === "seasonal"
          : (p: Product) => p.subcategory === "anti-pollution" || p.featured;

  picks.push(...pickByCategory(catalog, "plants", 2, plantPrefer));
  picks.push(...pickByCategory(catalog, "pots", 1, (p) => p.featured));
  picks.push(
    ...pickByCategory(
      catalog,
      input.style === "Festive" ? "gifting" : "lights",
      input.light === "shade" || input.style === "Festive" ? 2 : 1,
      (p) => p.featured || p.isDiwali
    )
  );

  if (input.size !== "Small") {
    picks.push(...pickByCategory(catalog, "decor", 1, (p) => p.featured));
  }

  // unique + budget trim
  const seen = new Set<string>();
  const unique = picks.filter((p) => {
    if (seen.has(p.slug)) return false;
    seen.add(p.slug);
    return true;
  });

  unique.sort((a, b) => a.price - b.price);
  const selected: Product[] = [];
  let sum = 0;
  for (const p of unique) {
    if (selected.length >= 6) break;
    if (sum + p.price <= input.budget || selected.length < 3) {
      selected.push(p);
      sum += p.price;
    }
  }
  return selected.slice(0, 6);
}
