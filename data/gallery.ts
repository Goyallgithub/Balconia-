/**
 * Gallery entries (v1 local). Regeneratable via `npx tsx scripts/gen-gallery.ts`.
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

export const gallery: GalleryItem[] = [
  {
    slug: "classic-warm-glow-gurgaon",
    title: "Classic Warm Glow",
    city: "Gurgaon",
    size: "Medium",
    style: "Festive",
    budget: "₹15-40k",
    caption:
      "A 6 by 12 ft high-rise balcony, lit with jhalar, leaf lanterns, and plant uplights in three evenings.",
    before: "/photos/before-01.jpg",
    after: "/photos/after-01.jpg",
    productSlugs: [
      "warm-white-bulb-curtain-string-light-12-feet",
      "diya-led-hanging-decoration-light-warm-white-1-foot",
      "peace-lily",
      "dec-003-gold-finish-metal-planter-with-black-stand",
    ],
    featured: true,
  },
  {
    slug: "garden-lounge-noida",
    title: "Garden Lounge",
    city: "Noida",
    size: "Large",
    style: "Tropical",
    budget: "₹40k+",
    caption:
      "From laundry rack to evening lounge: turf, cane seating, roses, and layered warm light.",
    before: "/photos/before-02.jpg",
    after: "/photos/after-02.jpg",
    productSlugs: [
      "areca-palm-3-feet-7-inch-pot",
      "bird-of-paradise-large-tub-plant",
      "green-leaf-vine-curtain-led-light-warm-white-12-feet",
      "dec-001-round-gold-metal-accent-table-with-wooden-top",
    ],
    featured: true,
  },
  {
    slug: "morning-light-delhi",
    title: "Morning Light",
    city: "Delhi",
    size: "Small",
    style: "Minimal",
    budget: "Under ₹15k",
    caption:
      "A compact 5 by 8 ft balcony, cleared and restyled with planters and soft daylight seating.",
    before: "/photos/before-03.jpg",
    after: "/photos/after-03.jpg",
    productSlugs: [
      "snake-plant-sansevieria-imported",
      "pot-rp0063-linea-white-marble",
      "crystal-bulb-cluster-led-string-light-warm-white-10-feet",
    ],
    featured: true,
  },
];

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
