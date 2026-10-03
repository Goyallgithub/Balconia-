/**
 * Scan /public/photos for before-NN.jpg / after-NN.jpg pairs and
 * regenerate data/gallery.ts placeholder entries.
 *
 * Run: npx tsx scripts/gen-gallery.ts
 * (Ask before adding tsx if not installed; or: npx --yes tsx scripts/gen-gallery.ts)
 */

import fs from "fs";
import path from "path";

const photosDir = path.join(process.cwd(), "public", "photos");
const outFile = path.join(process.cwd(), "data", "gallery.ts");

const files = fs.existsSync(photosDir) ? fs.readdirSync(photosDir) : [];
const befores = files
  .map((f) => f.match(/^before-(\d+)\.jpe?g$/i))
  .filter((m): m is RegExpMatchArray => Boolean(m))
  .map((m) => m[1])
  .sort((a, b) => Number(a) - Number(b));

const cities = ["Delhi", "Gurgaon", "Noida", "Mumbai", "Bengaluru", "Pune"];
const sizes = ["Small", "Medium", "Large"] as const;
const styles = ["Minimal", "Boho", "Modern", "Tropical", "Festive"] as const;
const budgets = ["Under ₹15k", "₹15-40k", "₹40k+"] as const;

const items = befores
  .filter((n) =>
    files.some((f) => f.toLowerCase() === `after-${n}.jpg` || f.toLowerCase() === `after-${n}.jpeg`)
  )
  .map((n, i) => {
    const num = n.padStart(2, "0");
    return {
      slug: `balcony-${num}`,
      title: `Balcony ${num}`,
      city: cities[i % cities.length],
      size: sizes[i % sizes.length],
      style: styles[i % styles.length],
      budget: budgets[i % budgets.length],
      caption: `A placeholder caption for balcony ${num}. Edit me.`,
      before: `/photos/before-${num}.jpg`,
      after: `/photos/after-${num}.jpg`,
      productSlugs: [] as string[],
      featured: i < 3,
    };
  });

const body = `/**
 * Gallery entries (v1 local). Regeneratable via \\\`npx tsx scripts/gen-gallery.ts\\\`.
 * Swap this module for a CMS later without touching components.
 */

export type GallerySize = "Small" | "Medium" | "Large";
export type GalleryStyle = "Minimal" | "Boho" | "Modern" | "Tropical" | "Festive";
export type GalleryBudget = "Under ₹15k" | "₹15-40k" | "₹40k+";

export type GalleryItem = {
  slug: string;
  title: string;
  city: string;
  size: GallerySize;
  style: GalleryStyle;
  budget: GalleryBudget;
  caption: string;
  before: string;
  after: string;
  productSlugs: string[];
  featured?: boolean;
};

export const gallery: GalleryItem[] = ${JSON.stringify(items, null, 2)};

export function getGallery(): GalleryItem[] {
  return gallery;
}

export function getGalleryItem(slug: string): GalleryItem | undefined {
  return gallery.find((g) => g.slug === slug);
}

export function getFeaturedGallery(): GalleryItem[] {
  return gallery.filter((g) => g.featured);
}

export function getGalleryByProduct(productSlug: string): GalleryItem[] {
  return gallery.filter((g) => g.productSlugs.includes(productSlug));
}
`;

fs.writeFileSync(outFile, body);
console.log(`Wrote ${items.length} gallery items to data/gallery.ts`);
