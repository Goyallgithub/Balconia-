/**
 * Script: seed-products.mjs
 * Purpose: Seed all products from lib/shop-data.json into Supabase products table
 * Run with: node --env-file=.env scripts/seed-products.mjs
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shopDataPath = path.join(__dirname, "..", "lib", "shop-data.json");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("🌱 Reading products from lib/shop-data.json...");
  const raw = fs.readFileSync(shopDataPath, "utf8");
  const products = JSON.parse(raw);
  console.log(`📦 Found ${products.length} products to seed.`);

  const rows = products.map((p, index) => ({
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
    sort_order: p.sortOrder ?? index,
    updated_at: new Date().toISOString(),
  }));

  const batchSize = 50;
  let totalSeeded = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    console.log(`⏳ Seeding batch ${Math.floor(i / batchSize) + 1} (${chunk.length} items)...`);
    const { error } = await supabase.from("products").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`❌ Batch error:`, error.message);
      process.exit(1);
    }
    totalSeeded += chunk.length;
  }

  console.log(`✅ Success! Seeded all ${totalSeeded} products into Supabase.`);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
