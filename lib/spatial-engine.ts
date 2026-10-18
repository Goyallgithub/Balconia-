export interface ProductDimensions {
  widthCm: number;
  depthCm: number;
  heightCm?: number;
  floorFootprint: boolean; // false for wall lights, ceiling fixtures, string lights
  source: "catalogue" | "inferred" | "category_default";
}

export interface PlacedProduct {
  productId: string;
  name: string;
  category: string;
  zone: "seating" | "plants" | "perimeter" | "flooring" | "corner" | "vertical";
  xCm: number;
  yCm: number;
  widthCm: number;
  depthCm: number;
  heightCm?: number;
  rotationDeg: number;
  floorFootprint: boolean;
}

export interface PlacementConflict {
  productId: string;
  name: string;
  reason: string;
  requiredClearanceCm?: number;
  availableClearanceCm?: number;
}

export interface SpatialLayout {
  balcony: {
    lengthCm: number;
    widthCm: number;
    areaSqFt: number;
    measured: boolean;
    isAssumption: boolean;
    narrow: boolean;
    sunExposure: string;
    weatherExposure: string;
  };
  circulation: {
    walkingCorridorWidthCm: number;
    corridorMaintained: boolean;
    doorClearanceMaintained: boolean;
    floorCoverageRatio: number;
  };
  placements: PlacedProduct[];
  conflicts: PlacementConflict[];
  spatialSummary: string;
  warnings: string[];
  disclaimer: string;
}

const FT_TO_CM = 30.48;
const MIN_WALKING_CORRIDOR_CM = 60; // 2 feet minimum clearance for walking
const MIN_DOOR_CLEARANCE_CM = 75; // Door swing clearance

/**
 * Deterministically parse physical dimensions from product catalogue size strings.
 * Examples: "60 × 60 cm", "120 × 180 cm", "Dia 40cm, H 45cm", "5 × 7 ft", "Table: 60x60cm"
 */
export function parseProductDimensions(product: {
  id?: string;
  category?: string;
  size?: string;
  name?: string;
}): ProductDimensions {
  const category = product.category || "";
  const sizeStr = (product.size || "").toLowerCase().trim();

  // Non-floor items (wall/ceiling/string lights)
  if (category === "lights") {
    const isStringOrWall = /string|fairy|wall|hanging|curtain/i.test(product.name || "") || !/floor|stand/i.test(product.name || "");
    if (isStringOrWall) {
      return { widthCm: 0, depthCm: 0, floorFootprint: false, source: "catalogue" };
    }
  }

  // Parse feet dimensions: e.g. "5 × 7 ft" or "5x7 ft"
  const ftMatch = sizeStr.match(/(\d+(?:\.\d+)?)\s*[×x*]\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|')/);
  if (ftMatch) {
    const w = Math.round(parseFloat(ftMatch[1]) * FT_TO_CM);
    const d = Math.round(parseFloat(ftMatch[2]) * FT_TO_CM);
    return { widthCm: Math.min(w, d), depthCm: Math.max(w, d), floorFootprint: true, source: "catalogue" };
  }

  // Parse centimeter dimensions: e.g. "60 × 60 cm" or "120 x 180 cm" or "60x60x75 cm"
  const cmMatch = sizeStr.match(/(\d+(?:\.\d+)?)\s*[×x*]\s*(\d+(?:\.\d+)?)(?:\s*[×x*]\s*(\d+(?:\.\d+)?))?\s*(?:cm)?/);
  if (cmMatch) {
    const d1 = Math.round(parseFloat(cmMatch[1]));
    const d2 = Math.round(parseFloat(cmMatch[2]));
    const d3 = cmMatch[3] ? Math.round(parseFloat(cmMatch[3])) : undefined;
    return {
      widthCm: Math.min(d1, d2),
      depthCm: Math.max(d1, d2),
      heightCm: d3,
      floorFootprint: true,
      source: "catalogue",
    };
  }

  // Parse diameter dimensions: e.g. "dia 30cm", "diameter: 40 cm", "Dia 40cm, H 45cm"
  const diaMatch = sizeStr.match(/(?:dia|diameter)[:\s]*(\d+(?:\.\d+)?)\s*(?:cm)?/);
  if (diaMatch) {
    const dia = Math.round(parseFloat(diaMatch[1]));
    const hMatch = sizeStr.match(/(?:h|height)[:\s]*(\d+(?:\.\d+)?)\s*(?:cm)?/);
    const heightCm = hMatch ? Math.round(parseFloat(hMatch[1])) : undefined;
    return { widthCm: dia, depthCm: dia, heightCm, floorFootprint: true, source: "catalogue" };
  }

  // Parse inch dimensions: e.g. "24 inch" or "12\""
  const inchMatch = sizeStr.match(/(\d+(?:\.\d+)?)\s*(?:inch|inches|")/);
  if (inchMatch) {
    const dia = Math.round(parseFloat(inchMatch[1]) * 2.54);
    return { widthCm: dia, depthCm: dia, floorFootprint: true, source: "catalogue" };
  }

  // Category defaults based on actual furniture and planter ergonomics
  if (category === "furniture") {
    if (/bistro|set|table/i.test(product.name || "")) {
      return { widthCm: 100, depthCm: 60, heightCm: 75, floorFootprint: true, source: "category_default" };
    }
    if (/chair|stool/i.test(product.name || "")) {
      return { widthCm: 50, depthCm: 50, heightCm: 80, floorFootprint: true, source: "category_default" };
    }
    return { widthCm: 60, depthCm: 50, floorFootprint: true, source: "category_default" };
  }

  if (category === "flooring") {
    return { widthCm: 120, depthCm: 180, floorFootprint: true, source: "category_default" };
  }

  if (category === "plants") {
    if (/palm|ficus|monstera|dracaena|large/i.test(product.name || "")) {
      return { widthCm: 45, depthCm: 45, heightCm: 120, floorFootprint: true, source: "category_default" };
    }
    if (/pot-|planter/i.test(product.id || "") || /planter/i.test(product.name || "")) {
      return { widthCm: 32, depthCm: 32, heightCm: 40, floorFootprint: true, source: "category_default" };
    }
    return { widthCm: 28, depthCm: 28, heightCm: 45, floorFootprint: true, source: "category_default" };
  }

  if (category === "decor") {
    return { widthCm: 25, depthCm: 25, heightCm: 30, floorFootprint: true, source: "category_default" };
  }

  return { widthCm: 30, depthCm: 30, floorFootprint: true, source: "category_default" };
}

/** Check 2D Axis-Aligned Bounding Box (AABB) overlap between two rectangular footprints */
function hasOverlap(
  a: { x: number; y: number; w: number; d: number },
  b: { x: number; y: number; w: number; d: number },
  margin = 2 // 2 cm tolerance
): boolean {
  return (
    a.x + margin < b.x + b.w &&
    a.x + a.w > b.x + margin &&
    a.y + margin < b.y + b.d &&
    a.y + a.d > b.y + margin
  );
}

/**
 * Validates spatial constraints and constructs a deterministic physical layout.
 */
export function buildSpatialLayout(input: {
  answers: {
    length?: number;
    width?: number;
    area?: string;
    sun?: string;
    weather?: string;
    mood?: string;
  };
  items: Array<{
    id: string;
    name: string;
    category?: string;
    quantity?: number;
    size?: string;
  }>;
}): SpatialLayout {
  const { answers, items } = input;
  const measured = Boolean(
    Number(answers.length) > 0 &&
    Number(answers.width) > 0 &&
    Number.isFinite(Number(answers.length)) &&
    Number.isFinite(Number(answers.width))
  );

  let lengthCm: number;
  let widthCm: number;
  let isAssumption = false;

  if (measured) {
    const rawLen = Math.max(Number(answers.length), Number(answers.width));
    const rawWid = Math.min(Number(answers.length), Number(answers.width));
    lengthCm = Math.round(rawLen * FT_TO_CM);
    widthCm = Math.round(rawWid * FT_TO_CM);
  } else {
    isAssumption = true;
    if (answers.area === "50+ sq ft") {
      lengthCm = Math.round(10.0 * FT_TO_CM); // ~305 cm
      widthCm = Math.round(6.0 * FT_TO_CM);  // ~183 cm
    } else if (answers.area === "30–50 sq ft") {
      lengthCm = Math.round(9.0 * FT_TO_CM);  // ~274 cm
      widthCm = Math.round(4.5 * FT_TO_CM);  // ~137 cm
    } else {
      // 20–30 sq ft or not measured
      lengthCm = Math.round(8.0 * FT_TO_CM);  // ~244 cm
      widthCm = Math.round(3.5 * FT_TO_CM);  // ~107 cm
    }
  }

  const areaSqFt = parseFloat(((lengthCm * widthCm) / (FT_TO_CM * FT_TO_CM)).toFixed(1));
  const narrow = widthCm < 107; // Under 3.5 ft width is narrow
  const warnings: string[] = [];
  const placements: PlacedProduct[] = [];
  const conflicts: PlacementConflict[] = [];

  if (!measured) {
    warnings.push("Balcony dimensions were not supplied; layout uses estimated 2D space based on selected area band.");
  }
  if (narrow) {
    warnings.push(`Balcony usable width is ${Math.round(widthCm / FT_TO_CM * 10) / 10} ft (< 3.5 ft). Seating is constrained to leave safe walking clearance.`);
  }

  // Zone coordinates:
  // Balcony coordinates: X from 0 (wall) to widthCm (railing); Y from 0 (entry doorway) to lengthCm (far wall).
  // Entry Doorway clearance: X: 0..75cm, Y: 0..MIN_DOOR_CLEARANCE_CM
  // Walking corridor reserved along length: X: 0..MIN_WALKING_CORRIDOR_CM, Y: 0..lengthCm
  const doorZone = { x: 0, y: 0, w: MIN_DOOR_CLEARANCE_CM, d: MIN_DOOR_CLEARANCE_CM };

  let currentSeatingY = MIN_DOOR_CLEARANCE_CM + 10;
  let currentPlantY = 10;
  let currentCornerY = Math.max(10, lengthCm - 60);

  for (const item of items) {
    const dims = parseProductDimensions(item);

    // 1. Non-floor footprint items (vertical lighting, hanging decor)
    if (!dims.floorFootprint) {
      placements.push({
        productId: item.id,
        name: item.name,
        category: item.category || "lights",
        zone: "vertical",
        xCm: 0,
        yCm: 0,
        widthCm: 0,
        depthCm: 0,
        heightCm: dims.heightCm,
        rotationDeg: 0,
        floorFootprint: false,
      });
      continue;
    }

    // 2. Flooring (rugs / carpets)
    if (item.category === "flooring") {
      const rugW = Math.min(dims.widthCm, Math.max(60, widthCm - 20));
      const rugD = Math.min(dims.depthCm, Math.max(100, lengthCm - MIN_DOOR_CLEARANCE_CM - 20));
      placements.push({
        productId: item.id,
        name: item.name,
        category: "flooring",
        zone: "flooring",
        xCm: Math.max(10, Math.round((widthCm - rugW) / 2)),
        yCm: MIN_DOOR_CLEARANCE_CM + 10,
        widthCm: rugW,
        depthCm: rugD,
        rotationDeg: 0,
        floorFootprint: true,
      });
      continue;
    }

    // 3. Furniture (seating, tables)
    if (item.category === "furniture") {
      // Check narrow balcony constraint
      if (narrow && dims.widthCm > 55) {
        conflicts.push({
          productId: item.id,
          name: item.name,
          reason: `Item width (${dims.widthCm} cm) cannot fit in narrow balcony (${widthCm} cm) while preserving the ${MIN_WALKING_CORRIDOR_CM} cm walking corridor.`,
          requiredClearanceCm: dims.widthCm + MIN_WALKING_CORRIDOR_CM,
          availableClearanceCm: widthCm,
        });
        continue;
      }

      // Check if product exceeds total length
      if (dims.depthCm > lengthCm - MIN_DOOR_CLEARANCE_CM) {
        conflicts.push({
          productId: item.id,
          name: item.name,
          reason: `Item length (${dims.depthCm} cm) exceeds available balcony length after door clearance.`,
          requiredClearanceCm: dims.depthCm + MIN_DOOR_CLEARANCE_CM,
          availableClearanceCm: lengthCm,
        });
        continue;
      }

      // Position seating against far end of balcony
      const posX = Math.max(10, widthCm - dims.widthCm - 10);
      const posY = Math.min(currentSeatingY, lengthCm - dims.depthCm - 10);

      const candidateBox = { x: posX, y: posY, w: dims.widthCm, d: dims.depthCm };
      const overlapsDoor = hasOverlap(candidateBox, doorZone);
      const overlapsExisting = placements
        .filter((p) => p.floorFootprint && p.zone !== "flooring")
        .some((p) => hasOverlap(candidateBox, { x: p.xCm, y: p.yCm, w: p.widthCm, d: p.depthCm }));

      if (overlapsDoor || overlapsExisting) {
        // Try shifting forward
        candidateBox.y = Math.max(MIN_DOOR_CLEARANCE_CM + 10, candidateBox.y - dims.depthCm - 10);
      }

      placements.push({
        productId: item.id,
        name: item.name,
        category: "furniture",
        zone: "seating",
        xCm: candidateBox.x,
        yCm: candidateBox.y,
        widthCm: dims.widthCm,
        depthCm: dims.depthCm,
        heightCm: dims.heightCm,
        rotationDeg: 0,
        floorFootprint: true,
      });

      currentSeatingY = candidateBox.y + dims.depthCm + 15;
      continue;
    }

    // 4. Plants & Planters
    if (item.category === "plants") {
      // Place plants along railing side (outer perimeter) or corner nook
      const isTall = (dims.heightCm || 0) >= 90 || /palm|ficus|monstera|dracaena|large|tall/i.test(item.name || "");
      let targetX: number;
      let targetY: number;
      let targetZone: "plants" | "corner" | "perimeter";

      if (isTall) {
        targetZone = "corner";
        targetX = Math.max(5, widthCm - dims.widthCm - 5);
        targetY = currentCornerY;
        currentCornerY = Math.max(10, currentCornerY - dims.depthCm - 10);
      } else {
        targetZone = "perimeter";
        targetX = Math.max(5, widthCm - dims.widthCm - 5);
        targetY = currentPlantY;
        currentPlantY += dims.depthCm + 10;
      }

      const plantBox = { x: targetX, y: targetY, w: dims.widthCm, d: dims.depthCm };
      // Verify plant does not block door
      if (hasOverlap(plantBox, doorZone)) {
        plantBox.y = MIN_DOOR_CLEARANCE_CM + 5;
      }

      placements.push({
        productId: item.id,
        name: item.name,
        category: "plants",
        zone: targetZone,
        xCm: plantBox.x,
        yCm: plantBox.y,
        widthCm: dims.widthCm,
        depthCm: dims.depthCm,
        heightCm: dims.heightCm,
        rotationDeg: 0,
        floorFootprint: true,
      });
      continue;
    }

    // 5. Decor / accent pieces
    placements.push({
      productId: item.id,
      name: item.name,
      category: item.category || "decor",
      zone: "perimeter",
      xCm: Math.max(5, Math.round(widthCm / 2) - Math.round(dims.widthCm / 2)),
      yCm: Math.min(lengthCm - dims.depthCm - 10, currentSeatingY + 10),
      widthCm: dims.widthCm,
      depthCm: dims.depthCm,
      heightCm: dims.heightCm,
      rotationDeg: 0,
      floorFootprint: true,
    });
  }

  // Circulation analysis
  const totalFloorAreaCm2 = lengthCm * widthCm;
  const occupiedFloorAreaCm2 = placements
    .filter((p) => p.floorFootprint && p.zone !== "flooring")
    .reduce((sum, p) => sum + p.widthCm * p.depthCm, 0);

  const floorCoverageRatio = Math.min(1, parseFloat((occupiedFloorAreaCm2 / totalFloorAreaCm2).toFixed(2)));
  const corridorMaintained = !narrow || placements.every((p) => p.zone !== "seating" || p.widthCm <= widthCm - MIN_WALKING_CORRIDOR_CM);
  const doorClearanceMaintained = placements
    .filter((p) => p.floorFootprint && p.zone !== "flooring")
    .every((p) => !hasOverlap({ x: p.xCm, y: p.yCm, w: p.widthCm, d: p.depthCm }, doorZone));

  const placedCount = placements.length;
  const conflictCount = conflicts.length;
  const spatialSummary = `${placedCount} products placed in ${Math.round(lengthCm / FT_TO_CM * 10) / 10} × ${Math.round(widthCm / FT_TO_CM * 10) / 10} ft (${areaSqFt} sq ft). Floor coverage: ${Math.round(floorCoverageRatio * 100)}%. ${corridorMaintained ? "Walking circulation maintained (>= 60 cm)." : "Walking corridor constrained."}${conflictCount ? ` ${conflictCount} item(s) could not fit.` : ""}`;

  return {
    balcony: {
      lengthCm,
      widthCm,
      areaSqFt,
      measured,
      isAssumption,
      narrow,
      sunExposure: answers.sun || "Not specified",
      weatherExposure: answers.weather || "Not specified",
    },
    circulation: {
      walkingCorridorWidthCm: MIN_WALKING_CORRIDOR_CM,
      corridorMaintained,
      doorClearanceMaintained,
      floorCoverageRatio,
    },
    placements,
    conflicts,
    spatialSummary,
    warnings,
    disclaimer: "Generated 2D layout and 3D visual concepts are architectural design illustrations and not guaranteed millimeter-exact blueprints. Final clearances must be verified during site measurement.",
  };
}

/** Formats the structured layout into explicit placement instructions for the AI image prompt */
export function formatLayoutForPrompt(layout: SpatialLayout): string {
  const lines: string[] = [
    `SPATIAL LAYOUT & CLEARANCE SPECIFICATION:`,
    `- Balcony Dimensions: ${layout.balcony.lengthCm} cm length × ${layout.balcony.widthCm} cm width (${layout.balcony.areaSqFt} sq ft)${layout.balcony.measured ? " (measured)" : " (estimated layout)"}`,
    `- Circulation: Keep minimum ${layout.circulation.walkingCorridorWidthCm} cm continuous walking path clear from door to railing.`,
  ];

  const floorItems = layout.placements.filter((p) => p.floorFootprint && p.zone !== "flooring");
  if (floorItems.length) {
    const placementsDesc = floorItems
      .map((p) => `${p.name} [Zone: ${p.zone}, approx X: ${p.xCm}cm, Y: ${p.yCm}cm, footprint ${p.widthCm}×${p.depthCm}cm]`)
      .join("; ");
    lines.push(`- Product Placements: ${placementsDesc}`);
  }

  const rug = layout.placements.find((p) => p.zone === "flooring");
  if (rug) {
    lines.push(`- Floor Foundation: ${rug.name} placed centered under seating area.`);
  }

  if (layout.conflicts.length) {
    lines.push(`- Omitted due to clearance constraints: ${layout.conflicts.map((c) => c.name).join(", ")}`);
  }

  return lines.join("\n");
}
