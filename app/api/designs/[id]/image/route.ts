import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import { getDesign } from "@/lib/design-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(request: Request, { params }: Ctx) {
  const kind = new URL(request.url).searchParams.get("kind") || "original";
  const row = await getDesign(params.id);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath =
    kind === "render" ? row.outputPath : row.originalPath;
  if (!filePath) {
    return NextResponse.json({ error: "Image not ready" }, { status: 404 });
  }

  try {
    const bytes = await fs.readFile(filePath);
    const mime =
      kind === "render"
        ? "image/webp"
        : row.originalMime || "image/webp";
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image missing" }, { status: 404 });
  }
}
