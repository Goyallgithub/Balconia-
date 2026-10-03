/**
 * Service packages (v1 local). Swap for CMS later; keep Service type stable.
 */

export type Service = {
  slug: string;
  name: string;
  description: string;
  priceFrom: number;
};

export const services: Service[] = [
  {
    slug: "starter-refresh",
    name: "Starter Refresh",
    description: "Plants, lights and one statement piece",
    priceFrom: 14999,
  },
  {
    slug: "signature-makeover",
    name: "Signature Makeover",
    description: "Full design, seating, planters, lighting, install",
    priceFrom: 34999,
  },
  {
    slug: "grand-balcony",
    name: "Grand Balcony",
    description: "Custom carpentry, vertical garden, complete styling",
    priceFrom: 74999,
  },
  {
    slug: "design-consult",
    name: "Design Consult only",
    description: "Mood board and shopping list, delivered in 48 hrs",
    priceFrom: 1499,
  },
];

export function getServices(): Service[] {
  return services;
}
