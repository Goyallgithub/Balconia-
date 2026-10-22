import { NextResponse } from "next/server";
import { getAllProducts } from "@/lib/product-store";

export const dynamic = "force-dynamic";

/**
 * Public Products Feed
 * Returns active products array directly for seamless drop-in compatibility with shop.js and diwali.js
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("q")?.toLowerCase();

    let list = await getAllProducts({ includeInactive: false });

    if (category && category !== "all") {
      list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.id.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search)
      );
    }

    return NextResponse.json(list, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { error: "Could not load products" },
      { status: 500 }
    );
  }
}
