import { formatLayoutForPrompt, type SpatialLayout } from "@/lib/spatial-engine";

type PlanItem = {
  quantity: number;
  name: string;
  size?: string;
};

type Plan = {
  answers: {
    mood: string;
    length?: number;
    width?: number;
    sun?: string;
    household?: string;
    weather?: string;
    care?: string;
    budget?: string;
    otherNotes?: string;
    extraProductIds?: string[];
  };
  items: PlanItem[];
  notes: string[];
  budgetTier?: number;
  subtotalPaise?: number;
  targetPaise?: number;
  spatialLayout?: SpatialLayout;
};

const MOOD_LABEL: Record<string, string> = {
  chai: "coffee and tea / morning chai",
  read: "reading",
  zen: "meditation",
  date: "romantic date",
  music: "music",
  party: "party lounge",
  garden: "gardening",
};

function densityDirection(tier: number | undefined, budget: string | undefined) {
  const t = tier ?? 0;
  if (t >= 3) {
    return `HIGH BUDGET (${budget}): Create a lush, layered, magazine-worthy makeover. Show denser planting, premium seating, coordinated planters, layered lighting and finishing decor. Every approved product should read clearly in the frame. Rich textures, abundant greenery, polished evening ambience — still realistic for this balcony size.`;
  }
  if (t >= 2) {
    return `UPPER-MID BUDGET (${budget}): Create a complete, elevated makeover with multiple plants, proper seating, lighting and a finished floor/rug where listed. Fuller and more intentional than a starter kit — warm premium Indian balcony styling.`;
  }
  if (t >= 1) {
    return `MID BUDGET (${budget}): Create a complete styled nook with the listed furniture, plants and light. Balanced and inviting, not sparse and not overcrowded.`;
  }
  return `STARTER BUDGET (${budget}): Keep the makeover simple and essential — only the listed pieces, airy composition, practical circulation. Do not invent extra furniture or dense decor.`;
}

/**
 * Server-built image prompt from the client's approved template + catalogue plan.
 * Pass `referenceMap` so the model knows which attached photo is which product.
 */
export function buildMakeoverPrompt(
  plan: Plan,
  referenceMap?: string
): string {
  const purpose = MOOD_LABEL[plan.answers.mood] || plan.answers.mood;
  const length = plan.answers.length || 0;
  const width = plan.answers.width || 0;
  const dims =
    length > 0 && width > 0
      ? `${length} × ${width} feet`
      : "dimensions not measured; do not invent a larger footprint";
  const people = plan.answers.household || "Adults";
  const sun = plan.answers.sun || "Not sure yet";
  const budget = plan.answers.budget || "not specified";
  const keep =
    "remove only movable clutter; keep structure and a clear walking route";
  const estimate =
    typeof plan.subtotalPaise === "number"
      ? `≈ ₹${Math.round(plan.subtotalPaise / 100).toLocaleString("en-IN")}`
      : "see product list";

  const products = plan.items
    .map(
      (x) => `${x.quantity} × ${x.name}${x.size ? ` (${x.size})` : ""}`
    )
    .join("; ");

  const mapBlock = referenceMap?.trim()
    ? `\nATTACHED REFERENCE MAP:\nReference image 1: the customer's real balcony (preserve this space exactly).\n${referenceMap.trim()}\n`
    : `\nReference image 1 is the existing balcony.\nReference images 2 onward show approved catalogue products.\n`;

  return `Create a photorealistic makeover of the exact balcony in reference image 1
for Balconia, a premium balcony styling company in India.
This is a personalised customer makeover — the after image must clearly be THIS balcony, restyled.
${mapBlock}
PRESERVE THE EXISTING SPACE:
Keep the original camera position, perspective, balcony proportions,
railings, walls, ceiling, doors, windows and external view.
Do not enlarge the balcony or change its architecture.
Keep doors, drains and a practical walking route clear.

CUSTOMER REQUIREMENTS:
Purpose: ${purpose}
Planning budget: ${budget}
Product estimate in this recipe: ${estimate}
Dimensions supplied by customer: ${dims}
People using the space: ${people}
Sunlight: ${sun}
Style preference: warm premium Indian balcony styling for ${purpose}
Keep or remove existing movable items: ${keep}
Extra customer requests: ${plan.answers.otherNotes || "none"}
Customer catalogue picks (feature these clearly if listed in approved products): ${(plan.answers.extraProductIds || []).length ? (plan.answers.extraProductIds || []).join(", ") : "none"}

BUDGET DENSITY (critical — results must differ by budget band):
${densityDirection(plan.budgetTier, budget)}

APPROVED PRODUCTS AND PLACEMENT (${plan.items.length} items — use all that fit):
${products || "No priced products selected — do not invent furniture."}

PLANT & PLANTER PAIRING RULE (Strict 1:1 Match):
Show exactly the approved plants, each potted inside its matching decorative planter. Every plant must have a planter; no plant is unpotted, and no planter is left empty without a plant. Do not generate extra random pots or plants beyond the approved count.

${plan.spatialLayout ? formatLayoutForPrompt(plan.spatialLayout) : ""}

Use only these approved additions. Match their visible shapes,
materials and colours as closely as possible.
Scale furniture and planters realistically to the supplied dimensions.
Prefer showing more of the approved list when the budget density is high,
as long as circulation stays clear. If an item truly cannot fit, omit it
rather than enlarge the balcony or block access.

DESIGN DIRECTION:
Create a warm, thoughtfully styled balcony with natural potted plants,
coordinated textures and decoration appropriate to the budget density.
Use the selected rug, furniture, lighting and finishing touches
to support the customer's chosen activity.
Keep planting realistic for the stated light conditions.
Maintain natural-looking illumination and believable shadows.

OUTPUT:
One sharp photographic after-makeover image of this same balcony.
No collage, before-and-after split, people, text, prices, labels,
watermarks, distorted furniture, floating objects, duplicate items
or decoration beyond the approved product list.
(Architectural concept visualization — final construction clearances verified separately).

Additional notes: ${plan.notes.join(" ")}`;
}
