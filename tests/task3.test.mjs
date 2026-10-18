import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {
  parseProductDimensions,
  buildSpatialLayout,
  formatLayoutForPrompt,
} from "../lib/spatial-engine.ts";
import { planBalcony } from "../lib/design-plan.mjs";
import products from "../lib/shop-data.json" with { type: "json" };

const BASE_URL = "http://localhost:3001";

describe("TASK 3: Physically Aware AI Balcony Design", () => {
  describe("3.1 Deterministic Product Dimension Parsing & Footprint Classification", () => {
    test("Parses centimeter dimensions (e.g., '60 × 60 cm', '120 x 180 cm')", () => {
      const p1 = parseProductDimensions({
        id: "chair-1",
        name: "Acacia Wood Folding Chair",
        category: "furniture",
        size: "45 × 52 cm",
      });
      assert.equal(p1.widthCm, 45);
      assert.equal(p1.depthCm, 52);
      assert.equal(p1.floorFootprint, true);
      assert.equal(p1.source, "catalogue");

      const p2 = parseProductDimensions({
        id: "rug-1",
        name: "Jute Outdoor Rug",
        category: "flooring",
        size: "120 × 180 cm",
      });
      assert.equal(p2.widthCm, 120);
      assert.equal(p2.depthCm, 180);
      assert.equal(p2.floorFootprint, true);
    });

    test("Parses feet dimensions (e.g., '5 × 7 ft')", () => {
      const p = parseProductDimensions({
        id: "turf-1",
        name: "Artificial Grass Turf",
        category: "flooring",
        size: "5 × 7 ft",
      });
      assert.equal(p.widthCm, Math.round(5 * 30.48)); // 152 cm
      assert.equal(p.depthCm, Math.round(7 * 30.48)); // 213 cm
      assert.equal(p.floorFootprint, true);
      assert.equal(p.source, "catalogue");
    });

    test("Parses diameter dimensions (e.g., 'Dia 40cm, H 45cm')", () => {
      const p = parseProductDimensions({
        id: "planter-1",
        name: "Terracotta Tapered Planter",
        category: "plants",
        size: "Dia 40cm, H 45cm",
      });
      assert.equal(p.widthCm, 40);
      assert.equal(p.depthCm, 40);
      assert.equal(p.floorFootprint, true);
    });

    test("Correctly flags non-floor items (wall/ceiling/string lights) as zero floor footprint", () => {
      const p = parseProductDimensions({
        id: "light-1",
        name: "Warm Fairy String Lights 10m",
        category: "lights",
        size: "10m length",
      });
      assert.equal(p.floorFootprint, false);
      assert.equal(p.widthCm, 0);
      assert.equal(p.depthCm, 0);
    });

    test("Falls back to category defaults when size metadata is absent or missing", () => {
      const p = parseProductDimensions({
        id: "bistro-unspecified",
        name: "Coffee Bistro Table",
        category: "furniture",
        size: "",
      });
      assert.equal(p.source, "category_default");
      assert.equal(p.floorFootprint, true);
      assert.ok(p.widthCm > 0);
      assert.ok(p.depthCm > 0);
    });
  });

  describe("3.2 Structured Spatial Planning Engine", () => {
    test("Large Balcony (14 × 6 ft): comfortably accommodates furniture, rug, and plants with valid circulation", () => {
      const layout = buildSpatialLayout({
        answers: {
          length: 14,
          width: 6,
          area: "50+ sq ft",
          sun: "Some morning sun",
          weather: "Covered, mostly sheltered",
          mood: "chai",
        },
        items: [
          { id: "furn-1", name: "Bistro Table & 2 Chairs", category: "furniture", size: "60 × 60 cm" },
          { id: "floor-1", name: "Jute Rug", category: "flooring", size: "120 × 180 cm" },
          { id: "plant-1", name: "Areca Palm", category: "plants", size: "Dia 35cm, H 120cm" },
          { id: "light-1", name: "Fairy String Lights", category: "lights" },
        ],
      });

      assert.equal(layout.balcony.measured, true);
      assert.equal(layout.balcony.isAssumption, false);
      assert.equal(layout.balcony.narrow, false);
      assert.ok(layout.balcony.lengthCm >= 420); // 14 ft * 30.48 = ~427 cm
      assert.ok(layout.balcony.widthCm >= 180);  // 6 ft * 30.48 = ~183 cm
      assert.equal(layout.circulation.corridorMaintained, true);
      assert.equal(layout.circulation.doorClearanceMaintained, true);
      assert.equal(layout.conflicts.length, 0);

      // Verify vertical item has zone vertical and floorFootprint false
      const light = layout.placements.find((p) => p.productId === "light-1");
      assert.ok(light);
      assert.equal(light.zone, "vertical");
      assert.equal(light.floorFootprint, false);

      // Verify palm is placed in corner zone
      const palm = layout.placements.find((p) => p.productId === "plant-1");
      assert.ok(palm);
      assert.equal(palm.zone, "corner");
    });

    test("Narrow Balcony (< 3.5 ft width): rejects oversized furniture that blocks minimum 60 cm walking corridor", () => {
      const layout = buildSpatialLayout({
        answers: {
          length: 10,
          width: 3.0, // 3 ft = 91 cm wide (< 107 cm is narrow)
          area: "20–30 sq ft",
          sun: "Strong afternoon sun",
          weather: "Open and exposed",
          mood: "zen",
        },
        items: [
          // 70 cm wide table leaves only 91 - 70 = 21 cm (< 60 cm required corridor)
          { id: "furn-oversized", name: "Wide Lounge Table", category: "furniture", size: "70 × 70 cm" },
          { id: "plant-small", name: "Small Snake Plant", category: "plants", size: "Dia 25cm" },
        ],
      });

      assert.equal(layout.balcony.narrow, true);
      assert.ok(layout.warnings.some((w) => w.includes("usable width")));
      assert.equal(layout.conflicts.length, 1);
      assert.equal(layout.conflicts[0].productId, "furn-oversized");
      assert.match(layout.conflicts[0].reason, /cannot fit in narrow balcony/i);
      assert.equal(layout.circulation.corridorMaintained, true);
    });

    test("Small Balcony (5 × 3 ft): detects excessive length constraint", () => {
      const layout = buildSpatialLayout({
        answers: {
          length: 5, // ~152 cm length
          width: 3,  // ~91 cm width
          area: "20–30 sq ft",
          mood: "read",
        },
        items: [
          // 120 cm depth + 75 cm door clearance = 195 cm > 152 cm length
          { id: "sofa-long", name: "Long Daybed Sofa", category: "furniture", size: "50 × 120 cm" },
        ],
      });

      assert.equal(layout.conflicts.length, 1);
      assert.match(layout.conflicts[0].reason, /exceeds available balcony length/i);
    });

    test("Missing balcony measurements: marks isAssumption=true, uses area band fallback, and warns explicitly", () => {
      const layout = buildSpatialLayout({
        answers: {
          length: 0,
          width: 0,
          area: "30–50 sq ft",
          mood: "chai",
        },
        items: [
          { id: "bistro", name: "Compact Bistro Set", category: "furniture", size: "50 × 50 cm" },
        ],
      });

      assert.equal(layout.balcony.measured, false);
      assert.equal(layout.balcony.isAssumption, true);
      assert.ok(layout.warnings.some((w) => w.includes("dimensions were not supplied")));
      assert.ok(layout.balcony.areaSqFt > 0);
    });

    test("Geometric Door Swing Clearance: door clearance zone (75 cm) is maintained", () => {
      const layout = buildSpatialLayout({
        answers: {
          length: 10,
          width: 5,
          area: "30–50 sq ft",
          mood: "date",
        },
        items: [
          { id: "chair", name: "Teak Armchair", category: "furniture", size: "50 × 50 cm" },
          { id: "potted-fic", name: "Ficus Plant", category: "plants", size: "Dia 30cm" },
        ],
      });

      assert.equal(layout.circulation.doorClearanceMaintained, true);
      for (const p of layout.placements) {
        if (p.floorFootprint && p.zone !== "flooring") {
          // No item should be inside door zone (X: 0..75, Y: 0..75)
          const inDoorZone = p.xCm < 75 && p.yCm < 75;
          assert.equal(inDoorZone, false, `Item ${p.name} violates door clearance at (${p.xCm}, ${p.yCm})`);
        }
      }
    });

    test("Architectural disclaimer is included", () => {
      const layout = buildSpatialLayout({
        answers: { length: 8, width: 4, area: "30–50 sq ft", mood: "chai" },
        items: [],
      });
      assert.match(layout.disclaimer, /architectural design illustrations/i);
      assert.match(layout.disclaimer, /not guaranteed millimeter-exact blueprints/i);
    });
  });

  describe("3.3 Layout Formatting for Image Generation Prompt", () => {
    test("formatLayoutForPrompt builds deterministic spatial instructions with circulation rules", () => {
      const layout = buildSpatialLayout({
        answers: {
          length: 12,
          width: 5,
          area: "50+ sq ft",
          mood: "garden",
        },
        items: [
          { id: "chair", name: "Balcony Bistro Chair", category: "furniture", size: "50 × 50 cm" },
          { id: "palm", name: "Tall Areca Palm", category: "plants", size: "Dia 35cm, H 110cm" },
        ],
      });

      const promptText = formatLayoutForPrompt(layout);
      assert.match(promptText, /SPATIAL LAYOUT & CLEARANCE SPECIFICATION/);
      assert.match(promptText, /Balcony Dimensions: \d+ cm length × \d+ cm width/);
      assert.match(promptText, /Keep minimum 60 cm continuous walking path clear/);
      assert.match(promptText, /Balcony Bistro Chair \[Zone: seating/);
      assert.match(promptText, /Tall Areca Palm \[Zone: corner/);
    });
  });

  describe("3.4 Integration with planBalcony & Design Generation Pipeline", () => {
    test("planBalcony attaches structured spatialLayout to generated design plan", () => {
      const plan = planBalcony(
        {
          mood: "chai",
          area: "30–50 sq ft",
          budget: "₹15,000–₹35,000",
          sun: "Some morning sun",
          care: "Keep it low-maintenance",
          weather: "Covered, mostly sheltered",
          household: "Adults",
          length: 10,
          width: 4.5,
        },
        products
      );

      assert.ok(plan.spatialLayout, "planBalcony must produce a spatialLayout");
      assert.equal(plan.spatialLayout.balcony.measured, true);
      assert.equal(plan.spatialLayout.balcony.lengthCm, Math.round(10 * 30.48));
      assert.ok(plan.spatialLayout.placements.length > 0);
      assert.ok(plan.spatialLayout.spatialSummary);
      assert.ok(plan.spatialLayout.disclaimer);
    });

    test("POST /api/designs persists structured spatialLayout in saved plan", async () => {
      const reqId = crypto.randomUUID();
      const realPhotoBytes = await fs.readFile(path.join(process.cwd(), "public/assets/balcony.jpg"));

      const form = new FormData();
      form.append("consent", "yes");
      form.append("requestId", reqId);
      form.append("photo", new Blob([realPhotoBytes], { type: "image/jpeg" }), "balcony.jpg");
      form.append(
        "answers",
        JSON.stringify({
          mood: "chai",
          area: "30–50 sq ft",
          budget: "₹15,000–₹35,000",
          sun: "Some morning sun",
          care: "Keep it low-maintenance",
          weather: "Covered, mostly sheltered",
          household: "Adults",
          length: 10,
          width: 4,
        })
      );

      const res = await fetch(`${BASE_URL}/api/designs`, {
        method: "POST",
        body: form,
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.plan);
      assert.ok(data.plan.spatialLayout);
      assert.equal(data.plan.spatialLayout.balcony.measured, true);
      assert.equal(data.plan.spatialLayout.balcony.narrow, false);
      assert.ok(data.plan.spatialLayout.placements.length > 0);
      assert.equal(data.plan.spatialLayout.circulation.doorClearanceMaintained, true);
    });

    test("POST /api/designs/:id/generate validates ID format and reports safe errors when provider fails", async () => {
      // 1. Invalid UUID
      const invalidRes = await fetch(`${BASE_URL}/api/designs/invalid-id/generate`, {
        method: "POST",
      });
      assert.equal(invalidRes.status, 400);

      // 2. Non-existent design
      const notFoundRes = await fetch(`${BASE_URL}/api/designs/${crypto.randomUUID()}/generate`, {
        method: "POST",
      });
      assert.equal(notFoundRes.status, 404);
    });
  });
});
