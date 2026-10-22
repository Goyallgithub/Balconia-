import { promises as fs } from "fs";
import path from "path";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase";
import localProductsDefault from "@/lib/shop-data.json";

export interface ProductImage {
  src: string;
  width?: number;
  height?: number;
  label?: string;
}

export interface Product {
  id: string;
  name: string;
  modelName?: string;
  category: string;
  detail?: string;
  description: string;
  size?: string;
  light?: string;
  pricePaise: number | null;
  mrpPaise?: number | null;
  discount?: number | null;
  images: ProductImage[];
  plantOnly?: boolean;
  planterOnly?: boolean;
  cataloguePreview?: boolean;
  aiEnhanced?: boolean;
  thumbnailOnly?: boolean;
  catalogueGroup?: string;
  fulfilmentMode?: string;
  requiresInstallation?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DbProductRow {
  id: string;
  name: string;
  model_name: string | null;
  category: string;
  detail: string | null;
  description: string;
  size: string | null;
  light: string | null;
  price_paise: number | null;
  mrp_paise: number | null;
  discount: number | null;
  images: unknown;
  plant_only: boolean;
  planter_only: boolean;
  catalogue_preview: boolean;
  ai_enhanced: boolean;
  thumbnail_only: boolean;
  catalogue_group: string | null;
  fulfilment_mode: string;
  requires_installation: boolean;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

const STORAGE_BUCKET = "balcony-designs";
const STORAGE_FILE_PATH = "catalog/product-overrides.json";

export function dbRowToProduct(row: DbProductRow): Product {
  let images: ProductImage[] = [];
  if (Array.isArray(row.images)) {
    images = row.images as ProductImage[];
  } else if (typeof row.images === "string") {
    try {
      images = JSON.parse(row.images);
    } catch {
      images = [];
    }
  }

  return {
    id: row.id,
    name: row.name,
    modelName: row.model_name || undefined,
    category: row.category,
    detail: row.detail || undefined,
    description: row.description || "",
    size: row.size || "",
    light: row.light || "",
    pricePaise: row.price_paise,
    mrpPaise: row.mrp_paise,
    discount: row.discount,
    images,
    plantOnly: row.plant_only ?? false,
    planterOnly: row.planter_only ?? false,
    cataloguePreview: row.catalogue_preview ?? false,
    aiEnhanced: row.ai_enhanced ?? false,
    thumbnailOnly: row.thumbnail_only ?? false,
    catalogueGroup: row.catalogue_group || undefined,
    fulfilmentMode: row.fulfilment_mode || "delivery-only",
    requiresInstallation: row.requires_installation ?? false,
    isActive: row.is_active ?? true,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function productToDbRow(p: Product): DbProductRow {
  return {
    id: p.id,
    name: p.name,
    model_name: p.modelName || null,
    category: p.category,
    detail: p.detail || null,
    description: p.description || "",
    size: p.size || null,
    light: p.light || null,
    price_paise: p.pricePaise ?? null,
    mrp_paise: p.mrpPaise ?? null,
    discount: p.discount ?? null,
    images: Array.isArray(p.images) ? p.images : [],
    plant_only: Boolean(p.plantOnly),
    planter_only: Boolean(p.planterOnly),
    catalogue_preview: Boolean(p.cataloguePreview),
    ai_enhanced: Boolean(p.aiEnhanced),
    thumbnail_only: Boolean(p.thumbnailOnly),
    catalogue_group: p.catalogueGroup || null,
    fulfilment_mode: p.fulfilmentMode || "delivery-only",
    requires_installation: Boolean(p.requiresInstallation),
    is_active: p.isActive !== false,
    sort_order: p.sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  };
}

// In-memory cache for fast edge and server requests
let cachedProducts: Product[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10000; // 10 seconds

export function invalidateProductsCache() {
  cachedProducts = null;
  lastCacheTime = 0;
}

/**
 * Storage Fallback: Read overrides from Supabase Storage
 */
async function loadOverridesFromStorage(): Promise<Record<string, Product>> {
  if (!supabaseConfigured()) return {};
  try {
    const { data, error } = await supabaseAdmin()
      .storage.from(STORAGE_BUCKET)
      .download(STORAGE_FILE_PATH);

    if (!error && data) {
      const text = await data.text();
      return JSON.parse(text);
    }
  } catch (err) {
    // Expected if bucket or file doesn't exist yet
  }
  return {};
}

/**
 * Storage Fallback: Save override to Supabase Storage
 */
async function saveOverrideToStorage(product: Product): Promise<void> {
  if (!supabaseConfigured()) return;
  try {
    const current = await loadOverridesFromStorage();
    current[product.id] = product;

    const buffer = Buffer.from(JSON.stringify(current, null, 2), "utf8");
    await supabaseAdmin()
      .storage.from(STORAGE_BUCKET)
      .upload(STORAGE_FILE_PATH, buffer, {
        contentType: "application/json",
        upsert: true,
      });
  } catch (err) {
    console.warn("Could not save to Supabase storage fallback:", err);
  }
}

/**
 * Storage Fallback: Drop override from Supabase Storage
 */
async function deleteOverrideFromStorage(
  id: string,
  permanent: boolean
): Promise<void> {
  if (!supabaseConfigured()) return;
  try {
    const current = await loadOverridesFromStorage();
    if (permanent) {
      delete current[id];
    } else if (current[id]) {
      current[id].isActive = false;
    } else {
      current[id] = { id, isActive: false } as Product;
    }

    const buffer = Buffer.from(JSON.stringify(current, null, 2), "utf8");
    await supabaseAdmin()
      .storage.from(STORAGE_BUCKET)
      .upload(STORAGE_FILE_PATH, buffer, {
        contentType: "application/json",
        upsert: true,
      });
  } catch (err) {
    console.warn("Could not delete from Supabase storage fallback:", err);
  }
}

/**
 * Fetch all products.
 * Priority 1: Supabase Postgres 'products' table.
 * Priority 2: Supabase Storage JSON 'catalog/product-overrides.json' + bundled shop-data.
 * Priority 3: Local bundled shop-data.
 */
export async function getAllProducts(options?: {
  includeInactive?: boolean;
  forceRefresh?: boolean;
}): Promise<Product[]> {
  const includeInactive = Boolean(options?.includeInactive);
  const now = Date.now();

  if (
    !options?.forceRefresh &&
    cachedProducts &&
    now - lastCacheTime < CACHE_TTL_MS
  ) {
    if (includeInactive) return cachedProducts;
    return cachedProducts.filter((p) => p.isActive !== false);
  }

  // 1. Try Supabase Postgres table
  if (supabaseConfigured()) {
    try {
      let query = supabaseAdmin()
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = (data as DbProductRow[]).map(dbRowToProduct);
        if (includeInactive) {
          cachedProducts = mapped;
          lastCacheTime = now;
        }
        return mapped;
      }

      // If table exists but has 0 products, automatically seed it
      if (!error && Array.isArray(data) && data.length === 0) {
        console.log("Supabase products table exists but is empty. Auto-seeding 452 products...");
        const seedResult = await seedProductsToSupabase();
        if (seedResult.seeded > 0) {
          const resAfterSeed = await query;
          if (resAfterSeed.data && resAfterSeed.data.length > 0) {
            const mapped = (resAfterSeed.data as DbProductRow[]).map(dbRowToProduct);
            cachedProducts = mapped;
            lastCacheTime = now;
            return mapped;
          }
        }
      }
    } catch {
      // Postgres table query failed or table doesn't exist yet; proceed to storage fallback
    }
  }

  // 2. Base list from local shop-data.json
  const defaultList: Product[] = (localProductsDefault as unknown as Product[]).map(
    (item, index) => ({
      ...item,
      isActive: item.isActive !== false,
      sortOrder: item.sortOrder ?? index,
    })
  );

  // 3. Merge Supabase Storage overrides if available
  let merged = defaultList;
  if (supabaseConfigured()) {
    try {
      const overrides = await loadOverridesFromStorage();
      const overrideKeys = Object.keys(overrides);
      if (overrideKeys.length > 0) {
        const listMap = new Map<string, Product>();
        defaultList.forEach((p) => listMap.set(p.id, p));

        for (const [id, overrideProduct] of Object.entries(overrides)) {
          if (listMap.has(id)) {
            listMap.set(id, { ...listMap.get(id)!, ...overrideProduct });
          } else {
            listMap.set(id, overrideProduct);
          }
        }
        merged = Array.from(listMap.values());
      }
    } catch {
      // Storage fallback failed; continue with base
    }
  }

  cachedProducts = merged;
  lastCacheTime = now;

  if (includeInactive) {
    return merged;
  }
  return merged.filter((p) => p.isActive !== false);
}

/**
 * Get single product by ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  if (!id) return null;

  if (supabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin()
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!error && data) {
        return dbRowToProduct(data as DbProductRow);
      }
    } catch {
      // Fall through to memory/storage
    }
  }

  const all = await getAllProducts({ includeInactive: true });
  return all.find((p) => p.id === id) || null;
}

/**
 * Save / Create or Update a product
 */
export async function saveProduct(product: Product): Promise<Product> {
  const updated: Product = {
    ...product,
    isActive: product.isActive !== false,
    updatedAt: new Date().toISOString(),
  };

  let savedInPostgres = false;

  // 1. Try Supabase Postgres table
  if (supabaseConfigured()) {
    try {
      const row = productToDbRow(updated);
      const { error } = await supabaseAdmin()
        .from("products")
        .upsert(row, { onConflict: "id" });

      if (!error) {
        savedInPostgres = true;
      }
    } catch {
      savedInPostgres = false;
    }

    // 2. If Postgres table did not save (e.g. table not created yet), save to Supabase Storage fallback
    if (!savedInPostgres) {
      await saveOverrideToStorage(updated);
    }
  }

  // 3. Keep local files in sync if filesystem is writable
  await syncLocalProduct(updated);

  invalidateProductsCache();
  return updated;
}

/**
 * Drop or delete a product
 */
export async function dropProduct(
  id: string,
  permanent: boolean = false
): Promise<{ success: boolean; dropped: boolean; permanent: boolean }> {
  let droppedInPostgres = false;

  if (supabaseConfigured()) {
    try {
      if (permanent) {
        const { error } = await supabaseAdmin()
          .from("products")
          .delete()
          .eq("id", id);
        if (!error) droppedInPostgres = true;
      } else {
        const { error } = await supabaseAdmin()
          .from("products")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (!error) droppedInPostgres = true;
      }
    } catch {
      droppedInPostgres = false;
    }

    if (!droppedInPostgres) {
      await deleteOverrideFromStorage(id, permanent);
    }
  }

  // Sync to local files
  await removeLocalProduct(id, permanent);

  invalidateProductsCache();
  return { success: true, dropped: !permanent, permanent };
}

/**
 * Seed all local shop-data into Supabase if table is empty
 */
export async function seedProductsToSupabase(): Promise<{
  seeded: number;
  error?: string;
}> {
  if (!supabaseConfigured()) {
    return { seeded: 0, error: "Supabase is not configured." };
  }

  try {
    const { count, error: countErr } = await supabaseAdmin()
      .from("products")
      .select("id", { count: "exact", head: true });

    if (countErr) {
      return { seeded: 0, error: countErr.message };
    }

    if (count && count > 0) {
      return { seeded: count };
    }

    const defaultList = localProductsDefault as unknown as Product[];
    const rows = defaultList.map((p, index) =>
      productToDbRow({ ...p, sortOrder: index })
    );

    const batchSize = 50;
    let totalSeeded = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const { error } = await supabaseAdmin().from("products").upsert(chunk);
      if (error) {
        return { seeded: totalSeeded, error: error.message };
      }
      totalSeeded += chunk.length;
    }

    invalidateProductsCache();
    return { seeded: totalSeeded };
  } catch (err: any) {
    return { seeded: 0, error: err?.message || "Seeding failed" };
  }
}

/**
 * Internal helpers to sync local files on disk (for dev, offline, and git tracking)
 */
async function syncLocalProduct(product: Product) {
  try {
    const targetPaths = [
      path.join(process.cwd(), "lib", "shop-data.json"),
      path.join(process.cwd(), "public", "shop-data.json"),
    ];

    for (const filePath of targetPaths) {
      let list: Product[] = [];
      try {
        const raw = await fs.readFile(filePath, "utf8");
        list = JSON.parse(raw);
      } catch {
        list = [...(localProductsDefault as unknown as Product[])];
      }

      const idx = list.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...product };
      } else {
        list.push(product);
      }

      await fs.writeFile(filePath, JSON.stringify(list, null, 2), "utf8");
    }
  } catch (err) {
    // Non-fatal if filesystem is read-only (e.g. on Vercel)
  }
}

async function removeLocalProduct(id: string, permanent: boolean) {
  try {
    const targetPaths = [
      path.join(process.cwd(), "lib", "shop-data.json"),
      path.join(process.cwd(), "public", "shop-data.json"),
    ];

    for (const filePath of targetPaths) {
      let list: Product[] = [];
      try {
        const raw = await fs.readFile(filePath, "utf8");
        list = JSON.parse(raw);
      } catch {
        continue;
      }

      if (permanent) {
        list = list.filter((p) => p.id !== id);
      } else {
        const target = list.find((p) => p.id === id);
        if (target) {
          target.isActive = false;
        }
      }

      await fs.writeFile(filePath, JSON.stringify(list, null, 2), "utf8");
    }
  } catch (err) {
    // Non-fatal if filesystem is read-only
  }
}
