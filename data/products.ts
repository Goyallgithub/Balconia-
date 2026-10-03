/**
 * Product catalog (v1 local). Swap this module for Supabase/Sanity later —
 * keep the Product type and getProduct(s) signatures stable for components.
 */

export type ProductCategory =
  | "planters"
  | "lighting"
  | "seating"
  | "rugs-decor"
  | "diwali";

export type Product = {
  slug: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  category: ProductCategory;
  tags: string[];
  shortDescription: string;
  longDescription: string;
  specs: string[];
  dimensions: string;
  material: string;
  care: string;
  images: string[];
  stock: number;
  isDiwali: boolean;
  featured: boolean;
  relatedSlugs: string[];
};

export const products: Product[] = [
  {
    slug: "terracotta-planter-trio",
    name: "Terracotta Planter Trio",
    price: 1899,
    compareAtPrice: 2299,
    category: "planters",
    tags: ["planters", "handmade", "bestseller"],
    shortDescription:
      "Hand-finished clay pots in three heights, made for narrow Indian balconies.",
    longDescription:
      "A set of three hand-finished terracotta planters sized for railing ledges and floor corners. The matte clay softens hard tile and pairs with ferns, money plant, or seasonal marigold. Drainage holes included; saucers pack flat for shipping.",
    specs: [
      "Set of 3 graduated heights",
      "Drainage hole in each pot",
      "Indoor and covered outdoor use",
      "Ships nested to save space",
    ],
    dimensions: "Tall 28 cm · Mid 22 cm · Small 16 cm (heights)",
    material: "Hand-finished terracotta clay",
    care: "Rinse with water. Avoid harsh detergents. Bring indoors in heavy rain if unsealed.",
    images: [
      "/products/terracotta-planter-trio-1.jpg",
      "/products/terracotta-planter-trio-2.jpg",
    ],
    stock: 42,
    isDiwali: false,
    featured: true,
    relatedSlugs: [
      "handwoven-jute-outdoor-rug",
      "jhalar-string-light-curtain",
      "diwali-edit-box",
    ],
  },
  {
    slug: "jhalar-string-light-curtain",
    name: "Jhalar String Light Curtain",
    price: 1299,
    compareAtPrice: 1599,
    category: "lighting",
    tags: ["lighting", "festive", "bestseller"],
    shortDescription:
      "Warm white jhalar curtain, 3 metres, for railings and door frames.",
    longDescription:
      "A soft warm-white string light curtain that turns a plain railing into evening glow. Plug-in with a long lead for typical Indian balcony sockets. Dimmable-friendly LEDs stay cool to the touch and sip power.",
    specs: [
      "3 m drop curtain",
      "Warm white 2700K LEDs",
      "IP44 splash resistant",
      "3 m power cord",
    ],
    dimensions: "Width 1 m · Drop 3 m",
    material: "Copper wire · plastic LED housings",
    care: "Wipe dry. Store coiled loosely. Do not leave in standing water.",
    images: [
      "/products/jhalar-string-light-curtain-1.jpg",
      "/products/jhalar-string-light-curtain-2.jpg",
    ],
    stock: 68,
    isDiwali: true,
    featured: true,
    relatedSlugs: [
      "brass-hanging-lantern",
      "diwali-edit-box",
      "terracotta-planter-trio",
    ],
  },
  {
    slug: "brass-hanging-lantern",
    name: "Brass Hanging Lantern",
    price: 2499,
    category: "lighting",
    tags: ["lighting", "brass", "pair"],
    shortDescription:
      "Leaf-cut brass lanterns, set of two, for railing hooks or wall brackets.",
    longDescription:
      "A pair of hanging brass lanterns with an open leaf cutwork that throws patterned light after dusk. Sized for balcony railings and corridor hooks. Use with tea lights or the included LED candles for worry-free evenings.",
    specs: [
      "Set of 2 lanterns",
      "Hanging ring included",
      "Fits standard tea light or LED candle",
      "Antique brass finish",
    ],
    dimensions: "Each 18 cm H × 12 cm W",
    material: "Brass with antique finish",
    care: "Dust with a soft cloth. Occasional brass polish keeps the warm tone.",
    images: [
      "/products/brass-hanging-lantern-1.jpg",
    ],
    stock: 31,
    isDiwali: true,
    featured: true,
    relatedSlugs: [
      "jhalar-string-light-curtain",
      "diwali-edit-box",
      "cane-rope-lounge-chair",
    ],
  },
  {
    slug: "cane-rope-lounge-chair",
    name: "Cane and Rope Lounge Chair",
    price: 6999,
    compareAtPrice: 8499,
    category: "seating",
    tags: ["seating", "cane", "lounge"],
    shortDescription:
      "Deep-seat cane lounge with cotton rope weave, built for compact balconies.",
    longDescription:
      "A low lounge chair with a cane frame and hand-wrapped cotton rope seat. Deep enough for evening chai, narrow enough for a 4-foot-wide balcony. Pair with the jute rug and a side lantern for a full lounge corner.",
    specs: [
      "Weight capacity 110 kg",
      "Weather-aware finish for covered balconies",
      "Cushion sold separately",
      "Flat-pack backrest for shipping",
    ],
    dimensions: "72 cm W × 78 cm D × 74 cm H",
    material: "Cane frame · cotton rope weave",
    care: "Keep under cover in monsoon. Spot clean rope with mild soap.",
    images: [
      "/products/cane-rope-lounge-chair-1.jpg",
    ],
    stock: 18,
    isDiwali: false,
    featured: true,
    relatedSlugs: [
      "handwoven-jute-outdoor-rug",
      "brass-hanging-lantern",
      "terracotta-planter-trio",
    ],
  },
  {
    slug: "handwoven-jute-outdoor-rug",
    name: "Handwoven Jute Outdoor Rug",
    price: 3499,
    category: "rugs-decor",
    tags: ["rugs", "jute", "floor"],
    shortDescription:
      "5 × 7 ft handwoven jute rug that softens tile without trapping heat.",
    longDescription:
      "A breathable jute rug sized for medium Indian balconies. The open weave lets air through on hot afternoons and defines a seating zone over cold tile. Natural tone works with terracotta, cane, and brass.",
    specs: [
      "5 × 7 ft coverage",
      "Reversible weave",
      "Low pile for chair legs",
      "Flat folded shipping",
    ],
    dimensions: "152 cm × 213 cm",
    material: "Handwoven natural jute",
    care: "Shake out weekly. Spot clean. Air dry fully before rolling to store.",
    images: [
      "/products/handwoven-jute-outdoor-rug-1.jpg",
    ],
    stock: 27,
    isDiwali: false,
    featured: true,
    relatedSlugs: [
      "cane-rope-lounge-chair",
      "terracotta-planter-trio",
      "jhalar-string-light-curtain",
    ],
  },
  {
    slug: "diwali-edit-box",
    name: "Diwali Edit Box",
    price: 1599,
    compareAtPrice: 1999,
    category: "diwali",
    tags: ["diwali", "gift", "festive"],
    shortDescription:
      "24 clay diyas, marigold toran, rangoli stencil set, and tea lights.",
    longDescription:
      "Everything for a quick festive balcony: twenty-four hand-pressed clay diyas, a marigold fabric toran for the door or railing, reusable rangoli stencils, and a tin of tea lights. Pack it with the jhalar curtain for a full Diwali night look.",
    specs: [
      "24 clay diyas",
      "Marigold fabric toran, 1.5 m",
      "3 rangoli stencils",
      "20 tea lights",
    ],
    dimensions: "Gift box 32 × 24 × 8 cm",
    material: "Clay · fabric · cardboard stencil · paraffin tea lights",
    care: "Diyas are single-season. Toran: spot clean. Keep tea lights away from fabric when lit.",
    images: [
      "/products/diwali-edit-box-1.jpg",
    ],
    stock: 55,
    isDiwali: true,
    featured: true,
    relatedSlugs: [
      "jhalar-string-light-curtain",
      "brass-hanging-lantern",
      "terracotta-planter-trio",
    ],
  },
];

export const CATEGORY_LABELS: Record<ProductCategory | "all", string> = {
  all: "All",
  planters: "Planters",
  lighting: "Lighting",
  seating: "Seating",
  "rugs-decor": "Rugs and Decor",
  diwali: "Diwali",
};

export function getProducts(): Product[] {
  return products;
}

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.featured);
}

export function getDiwaliProducts(): Product[] {
  return products.filter((p) => p.isDiwali);
}

export function getRelatedProducts(slug: string, limit = 3): Product[] {
  const product = getProduct(slug);
  if (!product) return [];
  return product.relatedSlugs
    .map((s) => getProduct(s))
    .filter((p): p is Product => Boolean(p))
    .slice(0, limit);
}
