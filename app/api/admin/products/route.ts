import { NextResponse } from "next/server";
import { isRequestAuthorizedAdmin } from "@/lib/admin-auth";
import { getAllProducts, saveProduct, getProductById, Product } from "@/lib/product-store";

export const dynamic = "force-dynamic";

/** Get all products for admin dashboard (including inactive/dropped) */
export async function GET(request: Request) {
  const isAuth = await isRequestAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const list = await getAllProducts({ includeInactive: true, forceRefresh: true });
    return NextResponse.json({ products: list, total: list.length });
  } catch (error) {
    console.error("GET /api/admin/products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

/** Add / Create a new product */
export async function POST(request: Request) {
  const isAuth = await isRequestAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const id = String(body.id || "").trim();
    const name = String(body.name || "").trim();
    const category = String(body.category || "").trim().toLowerCase();

    if (!id) {
      return NextResponse.json({ error: "Product ID is required (e.g. FUR-010, P025)" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: "Product category is required" }, { status: 400 });
    }

    // Check if ID already exists
    const existing = await getProductById(id);
    if (existing) {
      return NextResponse.json(
        { error: `Product ID '${id}' already exists. Use edit instead or choose a different ID.` },
        { status: 409 }
      );
    }

    // Handle prices (convert from rupees if client passed priceInRupees, or directly use pricePaise)
    let pricePaise: number | null = null;
    if (body.pricePaise !== undefined && body.pricePaise !== null) {
      pricePaise = Number(body.pricePaise);
    } else if (body.priceInRupees !== undefined && body.priceInRupees !== null && body.priceInRupees !== "") {
      pricePaise = Math.round(Number(body.priceInRupees) * 100);
    }

    let mrpPaise: number | null = null;
    if (body.mrpPaise !== undefined && body.mrpPaise !== null) {
      mrpPaise = Number(body.mrpPaise);
    } else if (body.mrpInRupees !== undefined && body.mrpInRupees !== null && body.mrpInRupees !== "") {
      mrpPaise = Math.round(Number(body.mrpInRupees) * 100);
    }

    // Calculate discount if not provided
    let discount = body.discount !== undefined ? Number(body.discount) : null;
    if (discount === null && mrpPaise && pricePaise && mrpPaise > pricePaise) {
      discount = Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100);
    }

    const newProduct: Product = {
      id,
      name,
      modelName: body.modelName ? String(body.modelName).trim() : undefined,
      category,
      detail: body.detail ? String(body.detail).trim() : undefined,
      description: String(body.description || "").trim(),
      size: String(body.size || "").trim(),
      light: String(body.light || "").trim(),
      pricePaise,
      mrpPaise,
      discount,
      images: Array.isArray(body.images) ? body.images : [],
      plantOnly: Boolean(body.plantOnly),
      planterOnly: Boolean(body.planterOnly),
      cataloguePreview: Boolean(body.cataloguePreview),
      aiEnhanced: Boolean(body.aiEnhanced),
      thumbnailOnly: Boolean(body.thumbnailOnly),
      catalogueGroup: body.catalogueGroup ? String(body.catalogueGroup).trim() : undefined,
      fulfilmentMode: body.fulfilmentMode || "delivery-only",
      requiresInstallation: Boolean(body.requiresInstallation),
      isActive: body.isActive !== false,
      sortOrder: Number(body.sortOrder) || 999,
    };

    const saved = await saveProduct(newProduct);
    return NextResponse.json({ ok: true, product: saved }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/products error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create product" },
      { status: 500 }
    );
  }
}
