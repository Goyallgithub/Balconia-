import { NextResponse } from "next/server";
import products from "@/lib/shop-data.json";
import { matchPlanterForPlant, type CatalogItem } from "@/lib/planter-matcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const plantId = String(body.plantId || "").trim();
    if (!plantId) {
      return NextResponse.json({ error: "Missing plantId." }, { status: 400 });
    }

    const catalog = products as CatalogItem[];
    const plant = catalog.find((x) => x.id === plantId);
    if (!plant) {
      return NextResponse.json({ error: "Plant not found." }, { status: 404 });
    }

    const match = matchPlanterForPlant(plant, catalog, {
      budgetPaise: typeof body.budgetPaise === "number" ? body.budgetPaise : undefined,
      existingPlanterIds: Array.isArray(body.existingPlanterIds) ? body.existingPlanterIds : [],
    });

    return NextResponse.json(match, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error matching planter.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
