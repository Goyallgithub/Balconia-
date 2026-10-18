import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isLivingPlant,
  isPlanterProduct,
  getPlantRootBallRequirement,
  matchPlanterForPlant,
  matchPlantersForCart,
} from "../lib/planter-matcher.ts";
import products from "../lib/shop-data.json" with { type: "json" };

const BASE_URL = "http://localhost:3001";

describe("TASK 5 — Automatic Plant and Planter Matching", () => {
  describe("5.1 Plant Classification & Root-Ball Requirement Analysis", () => {
    test("Identifies living plants needing planters vs items that already include planters", () => {
      const livingPlant = products.find((p) => p.id === "P001"); // Bamboo palm, plantOnly: true
      const planter = products.find((p) => p.id === "POT-Rp0056-SAND-MARBLE"); // plantOnly: false
      const decorPot = products.find((p) => p.id === "DEC-003"); // Gold metal planter

      assert.equal(isLivingPlant(livingPlant), true);
      assert.equal(isPlanterProduct(planter), true);
      assert.equal(isPlanterProduct(decorPot), true);
      assert.equal(isLivingPlant(planter), false);
    });

    test("Non-living items or plants that already include a planter return planterNeeded = false", () => {
      const planter = products.find((p) => p.id === "POT-Rp0056-SAND-MARBLE");
      const result = matchPlanterForPlant(planter, products);
      assert.equal(result.planterNeeded, false);
      assert.equal(result.matchedPlanter, null);
    });

    test("Handles missing plant dimensions explicitly using botanical profiles without guessing", () => {
      const palm = products.find((p) => p.id === "P001"); // Bamboo Palm, size is empty string
      assert.equal(palm.size, "");

      const req = getPlantRootBallRequirement(palm);
      assert.equal(req.source, "botanical_profile");
      assert.equal(req.sizeCategory, "large");
      assert.ok(req.minDiameterCm >= 25);
      assert.ok(req.explanation.includes("palm"));
    });

    test("Uses explicit catalogue dimensions when provided in plant metadata", () => {
      const plantWithDims = {
        id: "P-CUSTOM",
        name: "Custom Fiddle Leaf",
        size: "Dia 24cm, H 80cm",
        category: "plants",
        plantOnly: true,
        pricePaise: 50000,
      };

      const req = getPlantRootBallRequirement(plantWithDims);
      assert.equal(req.source, "catalogue_size");
      assert.equal(req.minDiameterCm, 26);
      assert.equal(req.maxDiameterCm, 36);
    });
  });

  describe("5.2 Deterministic Plant-to-Planter Matching Engine", () => {
    test("Matches living plant with a compatible, reasonably priced planter", () => {
      const palm = products.find((p) => p.id === "P001"); // Bamboo Palm
      const result = matchPlanterForPlant(palm, products);

      assert.equal(result.planterNeeded, true);
      assert.ok(result.matchedPlanter.id.startsWith("POT-"), "Must match a valid planter");
      assert.ok(result.matchedPlanter.pricePaise > 0);
      assert.ok(result.matchedPlanter.diameterCm >= 28);
      assert.ok(result.pairingReason.length > 0);
    });

    test("Provides multiple compatible planter options as alternatives", () => {
      const palm = products.find((p) => p.id === "P001");
      const result = matchPlanterForPlant(palm, products);

      assert.ok(result.alternativePlanters);
      assert.ok(result.alternativePlanters.length > 0);
      for (const alt of result.alternativePlanters) {
        assert.ok(alt.id);
        assert.ok(alt.name);
        assert.ok(alt.pricePaise > 0);
      }
    });

    test("Respects customer budget and selects affordable compatible planter over expensive ones", () => {
      const plant = products.find((p) => p.id === "P001");
      // Sierra planter is ₹950 (95,000 paise). Gold stand planter DEC-003 is ₹3,100 (310,000 paise).
      // With a cap of ₹1,200 (120,000 paise), DEC-003 is excluded and Sierra planter is matched.
      const result = matchPlanterForPlant(plant, products, { budgetPaise: 120_000 });

      assert.equal(result.planterNeeded, true);
      assert.ok(result.matchedPlanter);
      assert.ok(result.matchedPlanter.pricePaise <= 120_000);
      assert.equal(result.matchedPlanter.id.startsWith("POT-"), true);
    });

    test("Explains explicitly when no suitable planter is available within budget without silently choosing incompatible one", () => {
      const plant = products.find((p) => p.id === "P001");
      // Impossible budget of ₹200 (20,000 paise) — no compatible 12" ceramic/marble planter exists at this price
      const result = matchPlanterForPlant(plant, products, { budgetPaise: 20_000 });

      assert.equal(result.planterNeeded, true);
      assert.equal(result.matchedPlanter, null);
      assert.match(result.pairingReason, /no compatible planter found within budget/i);
    });
  });

  describe("5.3 Cart Planter Matching, Duplicate Prevention & Separate Pricing", () => {
    test("Cart matching: pairs living plant with separate planter line item", () => {
      const cart = [{ id: "P001", quantity: 1 }]; // Bamboo palm
      const result = matchPlantersForCart(cart, products);

      assert.equal(result.livingPlantsCount, 1);
      assert.equal(result.plantersCount, 0);
      assert.equal(result.plantersNeeded, 1);
      assert.equal(result.suggestedAdditions.length, 1);
      assert.ok(result.suggestedAdditions[0].id.startsWith("POT-"));
    });

    test("Duplicate prevention: avoids adding a second planter when a suitable one is already in the bag", () => {
      // Cart already has 1 living plant AND 1 compatible planter
      const cart = [
        { id: "P001", quantity: 1 },
        { id: "POT-Rp0056-SAND-MARBLE", quantity: 1 },
      ];
      const result = matchPlantersForCart(cart, products);

      assert.equal(result.livingPlantsCount, 1);
      assert.equal(result.plantersCount, 1);
      assert.equal(result.plantersNeeded, 0, "No additional planter should be needed");
      assert.equal(result.suggestedAdditions.length, 0);
    });

    test("Handles multiple plants: pairs correct number of planters", () => {
      // Cart has 2 living plants and 1 planter -> needs exactly 1 more planter
      const cart = [
        { id: "P001", quantity: 1 },
        { id: "P003", quantity: 1 },
        { id: "POT-Rp0056-SAND-MARBLE", quantity: 1 },
      ];
      const result = matchPlantersForCart(cart, products);

      assert.equal(result.livingPlantsCount, 2);
      assert.equal(result.plantersCount, 1);
      assert.equal(result.plantersNeeded, 1);
      assert.equal(result.suggestedAdditions.length, 1);
    });
  });

  describe("5.4 API Endpoint POST /api/planters/match", () => {
    test("Returns deterministic match for living plant via HTTP API", async () => {
      const res = await fetch(`${BASE_URL}/api/planters/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantId: "P001" }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.plantId, "P001");
      assert.equal(data.planterNeeded, true);
      assert.ok(data.matchedPlanter);
      assert.ok(data.matchedPlanter.pricePaise > 0);
      assert.ok(data.alternativePlanters.length > 0);
    });

    test("Rejects request with missing plantId with 400", async () => {
      const res = await fetch(`${BASE_URL}/api/planters/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /missing plantId/i);
    });

    test("Returns 404 for non-existent plantId", async () => {
      const res = await fetch(`${BASE_URL}/api/planters/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantId: "NON-EXISTENT-PLANT-999" }),
      });

      assert.equal(res.status, 404);
      const data = await res.json();
      assert.match(data.error, /plant not found/i);
    });
  });
});
