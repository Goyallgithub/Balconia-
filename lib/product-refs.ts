import path from "path";
import { promises as fs } from "fs";
import sharp from "sharp";
import products from "@/lib/shop-data.json";

type CatalogProduct = {
  id: string;
  name: string;
  category?: string;
  plantOnly?: boolean;
  pricePaise?: number | null;
  images?: Array<{ src: string }>;
};

type PlanItem = { id: string; name: string; quantity: number; size?: string };

export type ProductRef = {
  id: string;
  name: string;
  category: string;
  jpeg: Buffer;
};

function categoryRank(p: CatalogProduct): number {
  const id = p.id || "";
  const cat = p.category || "";
  if (cat === "furniture" || id.startsWith("FUR-") || id === "DEC-021") return 0;
  if (cat === "flooring" || id.startsWith("C") || id === "DEC-023") return 1;
  if (cat === "lights" || id.startsWith("L")) return 2;
  if (cat === "decor") return 3;
  if (cat === "plants" && (p.plantOnly || /^P\d/.test(id) || id.startsWith("U")))
    return 4;
  if (cat === "plants" && id.startsWith("POT-")) return 5;
  return 6;
}

async function toJpeg(bytes: Buffer, max = 1024): Promise<Buffer> {
  return sharp(bytes)
    .rotate()
    .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();
}

/**
 * Pick diverse, high-impact catalogue photos for the image model.
 * Early plan items (customer picks are added first) get priority.
 */
export async function loadHeroProductRefs(
  items: PlanItem[],
  maxRefs = 8
): Promise<ProductRef[]> {
  const catalog = products as CatalogProduct[];

  const ranked = items
    .map((item, index) => {
      const p = catalog.find((x) => x.id === item.id);
      if (!p?.images?.[0]?.src) return null;
      return {
        item,
        product: p,
        rank: categoryRank(p),
        // Customer catalogue picks are prepended in planBalcony
        boost: index < 6 ? 0 : 1,
      };
    })
    .filter(Boolean) as Array<{
    item: PlanItem;
    product: CatalogProduct;
    rank: number;
    boost: number;
  }>;

  ranked.sort((a, b) => {
    if (a.boost !== b.boost) return a.boost - b.boost;
    if (a.rank !== b.rank) return a.rank - b.rank;
    return (b.product.pricePaise || 0) - (a.product.pricePaise || 0);
  });

  // Keep category diversity: at most 3 living plants, 2 planters, 2 lights
  const counts: Record<string, number> = {};
  const selected: typeof ranked = [];
  for (const row of ranked) {
    const key =
      row.rank === 4
        ? "living"
        : row.rank === 5
          ? "planter"
          : row.rank === 2
            ? "light"
            : row.rank === 0
              ? "furn"
              : `r${row.rank}`;
    const limit =
      key === "living"
        ? 3
        : key === "planter"
          ? 2
          : key === "light"
            ? 2
            : key === "furn"
              ? 3
              : 2;
    if ((counts[key] || 0) >= limit) continue;
    counts[key] = (counts[key] || 0) + 1;
    selected.push(row);
    if (selected.length >= maxRefs) break;
  }

  const refs: ProductRef[] = [];
  for (const row of selected) {
    const src = row.product.images![0].src;
    try {
      const buf = await fs.readFile(path.join(process.cwd(), "public", src));
      refs.push({
        id: row.product.id,
        name: row.item.name || row.product.name,
        category: row.product.category || "product",
        jpeg: await toJpeg(buf, 1024),
      });
    } catch {
      // skip missing asset
    }
  }
  return refs;
}

export function referenceMapPrompt(refs: ProductRef[]): string {
  if (!refs.length) return "No product reference photos were attached.";
  return refs
    .map(
      (r, i) =>
        `Reference image ${i + 2}: catalogue photo of ${r.name} (${r.id}, ${r.category}). Match this product’s visible form, materials and colours.`
    )
    .join("\n");
}
