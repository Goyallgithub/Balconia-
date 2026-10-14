import { NextResponse } from "next/server";
import { getDesign, readDesignBytes } from "@/lib/design-store";
import { supabaseConfigured, userFromRequest } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(request: Request, { params }: Ctx) {
  const kind =
    new URL(request.url).searchParams.get("kind") === "render"
      ? "render"
      : "original";
  const row = await getDesign(params.id);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (supabaseConfigured() && row.ownerId) {
    const user = await userFromRequest(request);
    // Allow cookie-less <img> loads: signed query token optional; for private buckets
    // we stream via service role after checking design exists. Ownership enforced on
    // mutate routes; image URLs are unguessable UUIDs.
    if (user && user.id !== row.ownerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const bytes = await readDesignBytes(row, kind);
  if (!bytes) {
    return NextResponse.json({ error: "Image not ready" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type":
        kind === "render" ? "image/webp" : row.originalMime || "image/webp",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
