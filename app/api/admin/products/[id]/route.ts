import { NextResponse } from "next/server";
import { isRequestAuthorizedAdmin } from "@/lib/admin-auth";
import { getProductById, saveProduct, dropProduct, Product } from "@/lib/product-store";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
};

/** Get product details for editing */
export async function GET(request: Request, { params }: RouteParams) {
  const isAuth = await isRequestAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  const { id } = params;
  const product = await getProductById(id);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ product }, { headers: noCacheHeaders });
}

/** Update product details / prices / photos / status */
export async function PUT(request: Request, { params }: RouteParams) {
  const isAuth = await isRequestAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  const { id } = params;
  const existing = await getProductById(id);
  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Handle prices (allow passing priceInRupees or pricePaise)
    let pricePaise = existing.pricePaise;
    if (body.pricePaise !== undefined) {
      pricePaise = body.pricePaise === null ? null : Number(body.pricePaise);
    } else if (body.priceInRupees !== undefined) {
      pricePaise =
        body.priceInRupees === null || body.priceInRupees === ""
          ? null
          : Math.round(Number(body.priceInRupees) * 100);
    }

    let mrpPaise = existing.mrpPaise;
    if (body.mrpPaise !== undefined) {
      mrpPaise = body.mrpPaise === null ? null : Number(body.mrpPaise);
    } else if (body.mrpInRupees !== undefined) {
      mrpPaise =
        body.mrpInRupees === null || body.mrpInRupees === ""
          ? null
          : Math.round(Number(body.mrpInRupees) * 100);
    }

    // Auto-recalculate discount if not explicitly passed
    let discount = body.discount !== undefined ? (body.discount === null ? null : Number(body.discount)) : existing.discount;
    if (body.discount === undefined && mrpPaise && pricePaise && mrpPaise > pricePaise) {
      discount = Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100);
    } else if (mrpPaise && pricePaise && mrpPaise <= pricePaise) {
      discount = 0;
    }

    const updatedProduct: Product = {
      ...existing,
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      modelName: body.modelName !== undefined ? (body.modelName ? String(body.modelName).trim() : undefined) : existing.modelName,
      category: body.category !== undefined ? String(body.category).trim().toLowerCase() : existing.category,
      detail: body.detail !== undefined ? (body.detail ? String(body.detail).trim() : undefined) : existing.detail,
      description: body.description !== undefined ? String(body.description).trim() : existing.description,
      size: body.size !== undefined ? String(body.size).trim() : existing.size,
      light: body.light !== undefined ? String(body.light).trim() : existing.light,
      pricePaise,
      mrpPaise,
      discount,
      images: Array.isArray(body.images) ? body.images : existing.images,
      plantOnly: body.plantOnly !== undefined ? Boolean(body.plantOnly) : existing.plantOnly,
      planterOnly: body.planterOnly !== undefined ? Boolean(body.planterOnly) : existing.planterOnly,
      cataloguePreview: body.cataloguePreview !== undefined ? Boolean(body.cataloguePreview) : existing.cataloguePreview,
      aiEnhanced: body.aiEnhanced !== undefined ? Boolean(body.aiEnhanced) : existing.aiEnhanced,
      thumbnailOnly: body.thumbnailOnly !== undefined ? Boolean(body.thumbnailOnly) : existing.thumbnailOnly,
      catalogueGroup: body.catalogueGroup !== undefined ? (body.catalogueGroup ? String(body.catalogueGroup).trim() : undefined) : existing.catalogueGroup,
      fulfilmentMode: body.fulfilmentMode !== undefined ? body.fulfilmentMode : existing.fulfilmentMode,
      requiresInstallation: body.requiresInstallation !== undefined ? Boolean(body.requiresInstallation) : existing.requiresInstallation,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : existing.sortOrder,
    };

    const saved = await saveProduct(updatedProduct);
    return NextResponse.json({ ok: true, product: saved }, { headers: noCacheHeaders });
  } catch (error: any) {
    console.error(`PUT /api/admin/products/${id} error:`, error);
    return NextResponse.json(
      { error: error.message || "Failed to update product" },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

/** Drop or delete a product */
export async function DELETE(request: Request, { params }: RouteParams) {
  const isAuth = await isRequestAuthorizedAdmin(request);
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  const { id } = params;
  const existing = await getProductById(id);
  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404, headers: noCacheHeaders });
  }

  const { searchParams } = new URL(request.url);
  const permanent = searchParams.get("permanent") === "true";

  try {
    const result = await dropProduct(id, permanent);
    return NextResponse.json({
      ok: true,
      message: permanent ? `Product ${id} permanently deleted` : `Product ${id} dropped and archived`,
      ...result,
    }, { headers: noCacheHeaders });
  } catch (error: any) {
    console.error(`DELETE /api/admin/products/${id} error:`, error);
    return NextResponse.json(
      { error: error.message || "Failed to drop product" },
      { status: 500 }
    );
  }
}
