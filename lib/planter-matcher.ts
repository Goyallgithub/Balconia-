import { parseProductDimensions } from "./spatial-engine.ts";

export interface CatalogItem {
  id: string;
  name: string;
  category?: string;
  plantOnly?: boolean;
  pricePaise: number | null;
  size?: string;
  detail?: string;
  light?: string;
  description?: string;
  images?: Array<{ src: string }>;
}

export interface PlanterMatchResult {
  plantId: string;
  plantName: string;
  plantPricePaise: number;
  planterNeeded: boolean;
  matchedPlanter: {
    id: string;
    name: string;
    pricePaise: number;
    size: string;
    image: string;
    diameterCm: number;
  } | null;
  pairingReason: string;
  dimensionSource: "catalogue_size" | "botanical_profile" | "category_default" | "none";
  alternativePlanters?: Array<{
    id: string;
    name: string;
    pricePaise: number;
    size: string;
  }>;
}

export function isLivingPlant(item: { category?: string; plantOnly?: boolean }): boolean {
  return item.category === "plants" && item.plantOnly === true;
}

export function isPlanterProduct(item: {
  category?: string;
  plantOnly?: boolean;
  detail?: string;
  id?: string;
  name?: string;
}): boolean {
  if (item.category !== "plants") return false;
  if (item.plantOnly === true) return false;
  return (
    item.detail === "Planters" ||
    (item.id || "").startsWith("POT-") ||
    /planter|pot/i.test(item.name || "")
  );
}

export function getPlantRootBallRequirement(plant: {
  id: string;
  name: string;
  size?: string;
  description?: string;
}): {
  sizeCategory: "small" | "medium" | "large" | "extra_large";
  minDiameterCm: number;
  maxDiameterCm: number;
  recommendedInches: number;
  explanation: string;
  source: "catalogue_size" | "botanical_profile" | "category_default";
} {
  const name = (plant.name || "").toLowerCase();
  const desc = (plant.description || "").toLowerCase();
  const size = (plant.size || "").toLowerCase().trim();

  // If size string explicitly defines dimensions
  if (size) {
    const diaMatch = size.match(/(?:dia|diameter)[:\s]*(\d+(?:\.\d+)?)\s*(?:cm)?/);
    if (diaMatch) {
      const rootBallDia = Math.round(parseFloat(diaMatch[1]));
      return {
        sizeCategory: rootBallDia < 18 ? "small" : rootBallDia < 26 ? "medium" : "large",
        minDiameterCm: rootBallDia + 2,
        maxDiameterCm: rootBallDia + 12,
        recommendedInches: Math.round((rootBallDia + 5) / 2.54),
        explanation: `Plant has specified root-ball diameter of ${rootBallDia} cm; requires planter opening ${rootBallDia + 2}–${rootBallDia + 12} cm.`,
        source: "catalogue_size",
      };
    }
  }

  // Botanical profiles based on growth habit and standard nursery root balls
  if (/large tub|tub plant|5 feet|6 feet|bird of paradise - large/i.test(name + " " + desc)) {
    return {
      sizeCategory: "extra_large",
      minDiameterCm: 35,
      maxDiameterCm: 48,
      recommendedInches: 15,
      explanation: "Large tub specimen plant; requires 15″–18″ (38–46 cm) heavy-duty planter for root stability.",
      source: "botanical_profile",
    };
  }

  if (/palm|areca|bamboo palm|ficus|monstera|3 feet|4 feet|cypress|dracaena|large/i.test(name + " " + desc)) {
    return {
      sizeCategory: "large",
      minDiameterCm: 28,
      maxDiameterCm: 38,
      recommendedInches: 12,
      explanation: "Floor-standing palm / foliage plant in nursery bag; requires 12″–14″ (30–36 cm) planter for healthy root growth.",
      source: "botanical_profile",
    };
  }

  if (/snake plant|sansevieria|zz plant|aglaonema|peace lily|anthurium|croton|dieffenbachia|rubber|ixora/i.test(name + " " + desc)) {
    return {
      sizeCategory: "medium",
      minDiameterCm: 20,
      maxDiameterCm: 28,
      recommendedInches: 10,
      explanation: "Mid-sized bushy plant; requires 8″–10″ (20–26 cm) planter.",
      source: "botanical_profile",
    };
  }

  if (/succulent|jade|cactus|syngonium|money plant|pothos|spider plant|fern|dwarf/i.test(name + " " + desc)) {
    return {
      sizeCategory: "small",
      minDiameterCm: 14,
      maxDiameterCm: 22,
      recommendedInches: 8,
      explanation: "Compact / tabletop plant; requires 6″–8″ (15–20 cm) planter.",
      source: "botanical_profile",
    };
  }

  return {
    sizeCategory: "medium",
    minDiameterCm: 20,
    maxDiameterCm: 30,
    recommendedInches: 10,
    explanation: "Standard nursery plant; paired with 10″ (25 cm) diameter planter.",
    source: "category_default",
  };
}

export function matchPlanterForPlant(
  plant: CatalogItem,
  catalogue: CatalogItem[],
  options: {
    budgetPaise?: number;
    existingPlanterIds?: string[];
  } = {}
): PlanterMatchResult {
  if (!isLivingPlant(plant)) {
    return {
      plantId: plant.id,
      plantName: plant.name,
      plantPricePaise: plant.pricePaise || 0,
      planterNeeded: false,
      matchedPlanter: null,
      pairingReason: plant.category === "plants"
        ? "This item already includes a decorative container or is a planter."
        : "Not a living plant.",
      dimensionSource: "none",
    };
  }

  const req = getPlantRootBallRequirement(plant);

  const planters = catalogue.filter(
    (p) => isPlanterProduct(p) && typeof p.pricePaise === "number" && p.pricePaise > 0
  );

  const candidates: Array<{
    item: CatalogItem;
    diameterCm: number;
    depthCm: number;
    diff: number;
    pricePaise: number;
  }> = [];

  for (const pot of planters) {
    const dims = parseProductDimensions(pot);
    const dia = dims.widthCm;
    if (dia >= req.minDiameterCm && dia <= req.maxDiameterCm) {
      if (options.budgetPaise != null && (pot.pricePaise || 0) > options.budgetPaise) {
        continue;
      }
      candidates.push({
        item: pot,
        diameterCm: dia,
        depthCm: dims.depthCm,
        diff: Math.abs(dia - req.recommendedInches * 2.54),
        pricePaise: pot.pricePaise || 0,
      });
    }
  }

  if (candidates.length === 0) {
    return {
      plantId: plant.id,
      plantName: plant.name,
      plantPricePaise: plant.pricePaise || 0,
      planterNeeded: true,
      matchedPlanter: null,
      pairingReason: options.budgetPaise != null
        ? `No compatible planter found within budget of ₹${Math.round(options.budgetPaise / 100).toLocaleString("en-IN")}.`
        : "No compatible planter currently in stock matching these dimensions.",
      dimensionSource: req.source,
    };
  }

  candidates.sort((a, b) => {
    const aUsed = (options.existingPlanterIds || []).includes(a.item.id) ? 1 : 0;
    const bUsed = (options.existingPlanterIds || []).includes(b.item.id) ? 1 : 0;
    if (aUsed !== bUsed) return aUsed - bUsed;

    const aSierra = a.item.id.includes("POT-") ? 0 : 1;
    const bSierra = b.item.id.includes("POT-") ? 0 : 1;
    if (aSierra !== bSierra) return aSierra - bSierra;

    if (Math.abs(a.diff - b.diff) > 3) return a.diff - b.diff;
    return a.pricePaise - b.pricePaise;
  });

  const best = candidates[0];
  const alternatives = candidates.slice(1, 4).map((c) => ({
    id: c.item.id,
    name: c.item.name,
    pricePaise: c.item.pricePaise || 0,
    size: c.item.size || `${c.diameterCm} cm dia`,
  }));

  return {
    plantId: plant.id,
    plantName: plant.name,
    plantPricePaise: plant.pricePaise || 0,
    planterNeeded: true,
    matchedPlanter: {
      id: best.item.id,
      name: best.item.name,
      pricePaise: best.pricePaise,
      size: best.item.size || `${best.diameterCm} cm dia`,
      image: best.item.images?.[0]?.src || "",
      diameterCm: best.diameterCm,
    },
    pairingReason: `${req.explanation} Paired with ${best.item.name} (${Math.round(best.diameterCm / 2.54)}″ opening).`,
    dimensionSource: req.source,
    alternativePlanters: alternatives,
  };
}

export function matchPlantersForCart(
  cart: Array<{ id: string; quantity: number }>,
  catalogue: CatalogItem[],
  options: { budgetPaise?: number } = {}
): {
  livingPlantsCount: number;
  plantersCount: number;
  plantersNeeded: number;
  pairings: PlanterMatchResult[];
  suggestedAdditions: Array<{ id: string; quantity: number; forPlantId: string }>;
} {
  const livingPlants: CatalogItem[] = [];
  const existingPlanterIds: string[] = [];
  let plantersCount = 0;

  for (const item of cart) {
    const p = catalogue.find((x) => x.id === item.id);
    if (!p) continue;
    if (isLivingPlant(p)) {
      for (let i = 0; i < item.quantity; i++) {
        livingPlants.push(p);
      }
    } else if (isPlanterProduct(p)) {
      plantersCount += item.quantity;
      for (let i = 0; i < item.quantity; i++) {
        existingPlanterIds.push(p.id);
      }
    }
  }

  const livingPlantsCount = livingPlants.length;
  const plantersNeeded = Math.max(0, livingPlantsCount - plantersCount);
  const pairings: PlanterMatchResult[] = [];
  const suggestedAdditions: Array<{ id: string; quantity: number; forPlantId: string }> = [];

  const usedPlanters = [...existingPlanterIds];

  for (let i = 0; i < plantersNeeded; i++) {
    const plant = livingPlants[plantersCount + i];
    if (!plant) break;

    const match = matchPlanterForPlant(plant, catalogue, {
      budgetPaise: options.budgetPaise,
      existingPlanterIds: usedPlanters,
    });

    pairings.push(match);
    if (match.matchedPlanter) {
      usedPlanters.push(match.matchedPlanter.id);
      suggestedAdditions.push({
        id: match.matchedPlanter.id,
        quantity: 1,
        forPlantId: plant.id,
      });
    }
  }

  return {
    livingPlantsCount,
    plantersCount,
    plantersNeeded,
    pairings,
    suggestedAdditions,
  };
}
