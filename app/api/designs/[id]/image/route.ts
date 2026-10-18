import { NextResponse } from "next/server";
import { getDesign, readDesignBytes } from "@/lib/design-store";
import { supabaseConfigured, userFromRequest } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(request: Request, { params }: Ctx) {
  const id = params?.id?.trim();
  if (!id || !/^[a-f0-9-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid design identifier" }, { status: 400 });
  }

  // Authentication check first
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required to access design images" },
      { status: 401 }
    );
  }

  const row = await getDesign(id);
  if (!row) {
    return NextResponse.json({ error: "Design not found" }, { status: 404 });
  }

  // Authorization check: only design owner can access their design images
  if (row.ownerId && user.id !== row.ownerId) {
    return NextResponse.json(
      { error: "Access denied: you do not own this design image" },
      { status: 403 }
    );
  }

  const kind =
    new URL(request.url).searchParams.get("kind") === "render"
      ? "render"
      : "original";

  const bytes = await readDesignBytes(row, kind);
  if (!bytes) {
    return NextResponse.json({ error: "Image not ready" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type":
        kind === "render" ? "image/webp" : row.originalMime || "image/webp",
      "Cache-Control": "private, no-transform, max-age=3600",
    },
  });
}

