const choices = {
  mood: ["chai", "read", "party", "zen", "date", "music", "garden"],
  area: ["20–30 sq ft", "30–50 sq ft", "50+ sq ft", "Not measured yet"],
  budget: [
    "₹5,000–₹15,000",
    "₹15,000–₹35,000",
    "₹35,000–₹60,000",
    "₹60,000–₹1,00,000",
    "₹1 lakh and above",
  ],
  sun: [
    "Mostly shade",
    "Some morning sun",
    "Strong afternoon sun",
    "Not sure yet",
  ],
  care: ["Keep it low-maintenance", "I enjoy caring for plants"],
  weather: [
    "Covered, mostly sheltered",
    "Rain sometimes reaches the balcony",
    "Open and exposed to the weather",
  ],
  household: [
    "Adults",
    "Adults and children",
    "Adults and pets",
    "Adults, children and pets",
  ],
};

/** Upper spend cap in paise; null = uncapped. */
const BUDGET_CAPS = [1_500_000, 3_500_000, 6_000_000, 10_000_000, null];
/** Aim to fill this fraction of the cap so higher budgets look visibly richer. */
const BUDGET_FILL = [0.82, 0.85, 0.88, 0.9, 0.9];

export function validateAnswers(input) {
  if (!input || typeof input !== "object")
    throw Error("Invalid balcony answers.");
  const a = {};
  for (const [k, v] of Object.entries(choices)) {
    const value =
      input[k] ??
      (["care", "weather", "household"].includes(k) ? "Not specified" : undefined);
    if (value === "Not specified" && ["care", "weather", "household"].includes(k)) {
      a[k] = value;
      continue;
    }
    if (!v.includes(value)) throw Error("Please check your " + k + " answer.");
    a[k] = value;
  }
  for (const k of ["length", "width"]) {
    const n = Number(input[k] || 0);
    if (!Number.isFinite(n) || n < 0 || n > (k === "length" ? 100 : 30))
      throw Error("Invalid balcony dimensions.");
    a[k] = n;
  }
  a.otherNotes =
    typeof input.otherNotes === "string"
      ? input.otherNotes.trim().slice(0, 500)
      : "";
  const rawExtras = Array.isArray(input.extraProductIds)
    ? input.extraProductIds
    : typeof input.extraProductIds === "string"
      ? String(input.extraProductIds)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
  // Max 6 customer picks so the AI image stays readable
  a.extraProductIds = [
    ...new Set(
      rawExtras
        .map((id) => String(id || "").trim())
        .filter((id) => /^[A-Za-z0-9_-]{2,64}$/.test(id))
    ),
  ].slice(0, 6);
  return a;
}

function productLine(p, quantity = 1) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    quantity,
    unitPricePaise: p.pricePaise,
    image: p.images?.[0]?.src || "",
    plantOnly: !!p.plantOnly,
    size: p.size,
  };
}

function spend(items) {
  return items.reduce((s, x) => s + x.unitPricePaise * x.quantity, 0);
}

function isPlantLiving(p) {
  return (
    p.category === "plants" &&
    (p.plantOnly === true || /^P\d/.test(p.id) || p.id.startsWith("U"))
  );
}

function isPlanter(p) {
  return p.category === "plants" && String(p.id).startsWith("POT-");
}

function pricedInCategory(products, category, filterFn = () => true) {
  return products
    .filter(
      (p) =>
        p.category === category &&
        Number.isInteger(p.pricePaise) &&
        p.pricePaise > 0 &&
        filterFn(p)
    )
    .sort((a, b) => a.pricePaise - b.pricePaise);
}

/**
 * Budget-aware balcony recipe: higher bands get more layers (furniture, plants,
 * planters, lighting, decor) and fill toward the budget target.
 */
export function planBalcony(input, products) {
  const a = validateAnswers(input);
  const tier = choices.budget.indexOf(a.budget);
  const cap = BUDGET_CAPS[tier];
  const target =
    cap == null
      ? Math.max(12_000_000, spend([]) + 1)
      : Math.round(cap * BUDGET_FILL[tier]);
  const measured = a.length > 0 && a.width > 0;
  const area = measured
    ? a.length * a.width
    : a.area === "20–30 sq ft"
      ? 25
      : a.area === "30–50 sq ft"
        ? 40
        : a.area === "50+ sq ft"
          ? 60
          : 28;
  const narrow = measured && a.width < 3.5;
  const exposed = a.weather === "Open and exposed to the weather";
  const shared = a.household !== "Adults" && a.household !== "Not specified";
  const premium = tier >= 2;
  const luxury = tier >= 3;
  const notes = [];
  const items = [];
  const seen = new Set();

  const canAdd = (p, quantity = 1) => {
    if (!p || !Number.isInteger(p.pricePaise) || p.pricePaise <= 0) return false;
    if (seen.has(p.id)) return false;
    const next = spend(items) + p.pricePaise * quantity;
    if (cap != null && next > cap) return false;
    return true;
  };

  const add = (idOrProduct, quantity = 1) => {
    const p =
      typeof idOrProduct === "string"
        ? products.find((x) => x.id === idOrProduct)
        : idOrProduct;
    if (!canAdd(p, quantity)) return false;
    seen.add(p.id);
    items.push(productLine(p, quantity));
    return true;
  };

  const addAffordable = (candidates, preferExpensive = premium) => {
    const list = [...candidates].filter((p) => canAdd(p));
    if (!list.length) return false;
    list.sort((a, b) =>
      preferExpensive ? b.pricePaise - a.pricePaise : a.pricePaise - b.pricePaise
    );
    // Prefer the best that still leaves room under target when possible
    const underTarget = list.filter(
      (p) => spend(items) + p.pricePaise <= target || preferExpensive
    );
    return add((underTarget.length ? underTarget : list)[0]);
  };

  // —— 0) Customer catalogue picks (must-try first — these go into the AI image) ——
  const customerPicks = [];
  for (const id of a.extraProductIds || []) {
    const p = products.find((x) => x.id === id);
    if (!p || !Number.isInteger(p.pricePaise) || p.pricePaise <= 0) {
      notes.push(`Catalogue pick “${id}” was skipped (unavailable or unpriced).`);
      continue;
    }
    if (cap != null && p.pricePaise > cap) {
      notes.push(
        `Your pick “${p.name}” exceeds the selected budget band and was not auto-added.`
      );
      continue;
    }
    if (add(p)) customerPicks.push(p.name);
    else
      notes.push(
        `Your pick “${p.name}” could not fit in the remaining budget alongside other essentials.`
      );
  }
  if (customerPicks.length) {
    notes.push(
      "Customer catalogue picks to feature in the makeover: " +
        customerPicks.join(", ") +
        "."
    );
  }

  // —— 1) Seating / furniture by mood + budget ——
  if (!narrow) {
    if (a.mood === "zen") {
      add("DEC-019") || add("FUR-004");
      if (luxury) add("DEC-018");
    } else if (a.mood === "date" || a.mood === "party") {
      if (luxury) {
        add("FUR-009") || add("FUR-008") || add("FUR-007");
        add("DEC-021");
      } else if (premium) {
        add("FUR-007") || add("FUR-003") || add("DEC-021");
        if (area >= 35) add("DEC-021");
      } else if (tier >= 1) {
        add("DEC-021") || add("FUR-014") || add("FUR-002");
      } else {
        add("FUR-004") || add("FUR-005") || add("DEC-021");
      }
    } else if (a.mood === "read" || a.mood === "music") {
      if (luxury) add("FUR-008") || add("FUR-007") || add("FUR-003");
      else if (premium) add("FUR-003") || add("FUR-001") || add("DEC-015");
      else if (tier >= 1) add("DEC-015") || add("FUR-014") || add("FUR-002");
      else add("FUR-004") || add("FUR-005");
      if (tier >= 1) add("DEC-001") || add("FUR-013");
    } else if (a.mood === "garden") {
      if (tier >= 1) add("DEC-020");
      if (premium) add("DEC-021") || add("FUR-014");
      if (luxury) add("FUR-015");
    } else {
      // chai / default
      if (luxury) {
        add("FUR-010") || add("FUR-009") || add("FUR-008");
        add("DEC-021");
      } else if (premium) {
        add("FUR-007") || add("FUR-003") || add("DEC-021");
        if (area >= 30) add("DEC-001");
      } else if (tier >= 1) {
        add("DEC-021") || add("FUR-014");
        add("DEC-001") || add("FUR-013");
      } else {
        add("FUR-004") || add("DEC-001") || add("FUR-005");
      }
    }
  } else {
    notes.push(
      "Furniture is limited because the supplied width is under 3.5 ft. A measured layout is needed before adding seating."
    );
  }

  // —— 2) Flooring / rug ——
  if (!exposed && tier >= 1) {
    if (luxury || (premium && area >= 30)) add("DEC-023");
    else addAffordable(pricedInCategory(products, "flooring"));
  } else if (!exposed && tier === 0 && area >= 25) {
    add("C1") || add("DEC-023");
  }

  // —— 3) Lighting ——
  if (!exposed) {
    if (luxury) {
      add(a.mood === "date" || a.mood === "party" ? "L002" : "L001") ||
        add("DEC-027");
      add(a.mood === "read" || a.mood === "music" ? "DEC-008" : "L013") ||
        add("L016");
      if (a.mood === "party" || a.mood === "date") add("DEC-022") || add("L016");
    } else if (premium) {
      add(a.mood === "date" ? "L013" : a.mood === "party" ? "L016" : "DEC-008") ||
        add("L014");
      add("DEC-005") || add("L011");
    } else if (tier >= 1) {
      add(a.mood === "date" ? "L013" : a.mood === "party" ? "L016" : "L014");
      if (a.mood === "read" || a.mood === "music") add("DEC-008");
    } else {
      add("L014") || add("L011") || add("L018");
    }
  }

  // —— 4) Plants by light + density by budget ——
  const shade = a.sun === "Mostly shade";
  const hot = a.sun === "Strong afternoon sun";
  const plantPool = pricedInCategory(products, "plants", isPlantLiving).filter(
    (p) => p.pricePaise >= 13_000 && p.pricePaise <= (luxury ? 2_500_000 : 600_000)
  );
  const heroPlants = shade
    ? ["P002", "P004", "P001", "P003", "P011", "P013"]
    : hot
      ? ["P022", "P021", "P023", "P015", "P007", "P008"]
      : ["P001", "P002", "P021", "P022", "P004", "P015"];

  const plantCount =
    a.mood === "garden"
      ? luxury
        ? 8
        : premium
          ? 6
          : tier >= 1
            ? 4
            : 3
      : luxury
        ? 6
        : premium
          ? 4
          : tier >= 1
            ? 3
            : 2;

  for (const id of heroPlants) {
    if (items.filter((x) => products.find((p) => p.id === x.id && isPlantLiving(p))).length >= plantCount)
      break;
    add(id);
  }
  while (
    items.filter((x) => {
      const p = products.find((q) => q.id === x.id);
      return p && isPlantLiving(p);
    }).length < plantCount
  ) {
    if (!addAffordable(plantPool, premium)) break;
  }

  if (shared) {
    add("P001");
    notes.push(
      "Shared spaces need an individual plant and balcony-safety review; this list is not a safety certification."
    );
  }

  // —— 5) Decorative planters (higher budgets) ——
  const planterNeed =
    luxury ? 3 : premium ? 2 : tier >= 1 ? 1 : 0;
  const maxPlanterPaise =
    area < 30 ? (luxury ? 900_000 : 500_000) : luxury ? 1_600_000 : 400_000;
  const planters = pricedInCategory(products, "plants", isPlanter).filter(
    (p) =>
      p.id.includes("SAND-MARBLE") &&
      !/\b50["”]|\b48["”]/.test(String(p.name)) &&
      (area >= 35 || !/\b36["”]|\b30["”]/.test(String(p.name))) &&
      p.pricePaise >= (premium ? 80_000 : 40_000) &&
      p.pricePaise <= maxPlanterPaise
  );
  for (let i = 0; i < planterNeed; i++) {
    if (!addAffordable(planters, luxury || premium)) break;
  }

  // —— 6) Decor / finishing ——
  if (a.mood === "date") add("DEC-024");
  if (tier >= 1) add("DEC-012") || add("DEC-009") || add("DEC-026");
  if (premium) add("DEC-006") || add("DEC-025") || add("FUR-011");
  if (luxury) {
    add("DEC-017") || add("DEC-002") || add("DEC-004");
    add("DEC-018") || add("FUR-012");
  }

  // —— 7) Fill toward budget target (visible upgrade for 60k / 1L) ——
  const fillers = [
    ...pricedInCategory(products, "furniture").filter((p) => !narrow),
    ...pricedInCategory(products, "decor"),
    ...pricedInCategory(products, "lights").filter(() => !exposed),
    ...pricedInCategory(products, "plants", isPlantLiving),
    ...pricedInCategory(products, "plants", isPlanter).filter((p) =>
      p.id.includes("SAND-MARBLE")
    ),
    ...pricedInCategory(products, "flooring").filter(() => !exposed),
  ];

  // Prefer mid-to-high ticket pieces when budget is high so the set looks richer
  const minFillPrice =
    luxury ? 150_000 : premium ? 80_000 : tier >= 1 ? 30_000 : 0;
  let guard = 0;
  while (spend(items) < target && guard++ < 40) {
    const room = (cap ?? Infinity) - spend(items);
    const candidates = fillers.filter(
      (p) =>
        canAdd(p) &&
        p.pricePaise <= room &&
        p.pricePaise >= Math.min(minFillPrice, room) &&
        spend(items) + p.pricePaise <= (cap ?? Infinity)
    );
    if (!candidates.length) {
      const any = fillers.filter((p) => canAdd(p) && p.pricePaise <= room);
      if (!any.length) break;
      any.sort((a, b) => b.pricePaise - a.pricePaise);
      if (!add(any[0])) break;
      continue;
    }
    candidates.sort((a, b) => b.pricePaise - a.pricePaise);
    if (!add(candidates[0])) break;
  }

  if (a.weather === "Not specified") {
    notes.push(
      "Rain exposure was not supplied; confirm weather protection before finalising the design."
    );
  }
  if (exposed) {
    notes.push(
      "Indoor-style rugs and electrical lights are excluded from this automatic list. Confirm outdoor ratings and weather protection before adding them."
    );
  }
  if (!measured) {
    notes.push(
      "The photo cannot provide reliable measurements. Measure length, usable width, door swing and drains before ordering furniture."
    );
  }
  if (a.mood === "garden") {
    notes.push(
      "These are listed ornamental and aromatic plants. Edible herbs are not currently priced in the catalogue."
    );
  }
  if (a.otherNotes) notes.push("Customer note: " + a.otherNotes);
  if ((a.extraProductIds || []).length && !customerPicks.length) {
    notes.push(
      "Catalogue picks were requested but none could be included — check budget or product availability."
    );
  }
  notes.push(
    `Planning budget ${a.budget}: product recipe targets about ₹${Math.round(target / 100).toLocaleString("en-IN")} within the selected band.`,
    "Plant prices include their supplied nursery pot/bag. Decorative planters are separate listed items; confirm root-ball fit.",
    "Catalogue prices are used for the product estimate. Stock, dimensions, delivery, installation, electrical work and any extra styling items must be confirmed separately."
  );

  return {
    answers: a,
    items,
    subtotalPaise: spend(items),
    notes,
    area,
    capPaise: cap,
    budgetTier: tier,
    targetPaise: target,
  };
}

export function imagePrompt(plan) {
  return buildLegacyImagePrompt(plan);
}

function buildLegacyImagePrompt(plan) {
  const density =
    (plan.budgetTier ?? 0) >= 3
      ? "lush layered premium styling with every listed product clearly visible"
      : (plan.budgetTier ?? 0) >= 2
        ? "rich complete makeover with multiple plants, seating and lighting"
        : (plan.budgetTier ?? 0) >= 1
          ? "complete styled nook"
          : "simple essential styling";
  return `Edit source image 1: the customer's actual balcony. Preserve the existing balcony footprint, walls, railing, windows, doors, drains, building view, perspective and proportions. Do not enlarge the balcony or invent construction, extra rooms or openings. Remove movable clutter only and style for ${plan.answers.mood} within budget ${plan.answers.budget} (${density}). Inputs after image 1 are product reference photos: preserve their distinctive designs. Use only these priced items: ${plan.items.map((x) => x.quantity + " × " + x.name + (x.size ? " (" + x.size + ")" : "")).join("; ")}. Answers: ${JSON.stringify(plan.answers)}. Retain realistic circulation and door clearance. Do not add unpriced furniture, lamps, rugs, decorative planters or accessories. Plants use nursery pots unless a planter is explicitly listed; do not invent premium pots. Create a crisp premium photorealistic architectural design concept of this SAME balcony. No people, text, logos or watermark. Do not treat photo dimensions as measured facts. Notes: ${plan.notes.join(" ")}`;
}
