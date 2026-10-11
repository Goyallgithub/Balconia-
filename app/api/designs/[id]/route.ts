import { NextResponse } from "next/server";
import {
  deleteDesign,
  designPublicResult,
  getDesign,
} from "@/lib/design-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

type Ctx = { params: { id: string } };

export async function GET(_request: Request, { params }: Ctx) {
  const row = await getDesign(params.id);
  if (!row) return json({ error: "Design not found." }, 404);
  return json(designPublicResult(row));
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const row = await getDesign(params.id);
  if (!row) return json({ error: "Design not found." }, 404);
  await deleteDesign(params.id);
  return json({ ok: true });
}
