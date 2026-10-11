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
  };
  items: PlanItem[];
  notes: string[];
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

/**
 * Server-built Leonardo prompt from the client's approved template + catalogue plan.
 */
export function buildMakeoverPrompt(plan: Plan): string {
  const purpose = MOOD_LABEL[plan.answers.mood] || plan.answers.mood;
  const length = plan.answers.length || 0;
  const width = plan.answers.width || 0;
  const dims =
    length > 0 && width > 0
      ? `${length} × ${width} feet`
      : "dimensions not measured; do not invent a larger footprint";
  const people = plan.answers.household || "Adults";
  const sun = plan.answers.sun || "Not sure yet";
  const keep = "remove only movable clutter; keep structure and a clear walking route";

  const products = plan.items
    .map(
      (x) =>
        `${x.quantity} × ${x.name}${x.size ? ` (${x.size})` : ""}`
    )
    .join("; ");

  return `Create a photorealistic makeover of the exact balcony in reference image 1
for Balconia, a premium balcony styling company in India.

Reference image 1 is the existing balcony.
Reference images 2 onward show the approved catalogue products.

PRESERVE THE EXISTING SPACE:
Keep the original camera position, perspective, balcony proportions,
railings, walls, ceiling, doors, windows and external view.
Do not enlarge the balcony or change its architecture.
Keep doors, drains and a practical walking route clear.

CUSTOMER REQUIREMENTS:
Purpose: ${purpose}
Dimensions supplied by customer: ${dims}
People using the space: ${people}
Sunlight: ${sun}
Style preference: warm premium Indian balcony styling for ${purpose}
Keep or remove existing movable items: ${keep}

APPROVED PRODUCTS AND PLACEMENT:
${products || "No priced products selected — do not invent furniture."}

Use only these approved additions. Match their visible shapes,
materials and colours as closely as possible.
Scale furniture and planters realistically to the supplied dimensions.
If all selected items cannot fit, omit an item rather than enlarge
the balcony or block access.

DESIGN DIRECTION:
Create a warm, premium, thoughtfully styled balcony with natural
potted plants, coordinated textures and restrained decoration.
Use the selected rug, furniture, lighting and finishing touches
to support the customer's chosen activity.
Keep planting realistic for the stated light conditions.
Maintain natural-looking illumination and believable shadows.

OUTPUT:
One sharp photographic after-makeover image of this same balcony.
No collage, before-and-after split, people, text, prices, labels,
watermarks, distorted furniture, floating objects, duplicate items
or excessive decoration.

Additional notes: ${plan.notes.join(" ")}`;
}
