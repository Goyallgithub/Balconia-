import { NextResponse } from "next/server";
import {
  countCompletedGenerationsForUser,
  deleteDesign,
  designPublicResult,
  getDesign,
} from "@/lib/design-store";
import {
  MAX_GENERATIONS_PER_USER,
  supabaseConfigured,
  userFromRequest,
} from "@/lib/supabase";
import { isValidOrigin } from "@/lib/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

type Ctx = { params: { id: string } };

export async function GET(request: Request, { params }: Ctx) {
  const id = params?.id?.trim();
  if (!id || !/^[a-f0-9-]{36}$/i.test(id)) {
    return json({ error: "Invalid design identifier." }, 400);
  }

  const row = await getDesign(id);
  if (!row) return json({ error: "Design not found." }, 404);

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;

  if (supabaseConfigured() && row.ownerId) {
    const user = await userFromRequest(request);
    if (!user || user.id !== row.ownerId) {
      return json({ error: "Design not found or access denied." }, 404);
    }
  }
  const out = designPublicResult(row, token);
  if (row.ownerId) {
    const used = await countCompletedGenerationsForUser(row.ownerId);
    out.generationsRemaining = MAX_GENERATIONS_PER_USER <= 0 ? null : Math.max(0, MAX_GENERATIONS_PER_USER - used);
  }
  return json(out);
}

export async function DELETE(request: Request, { params }: Ctx) {
  if (!isValidOrigin(request)) {
    return json({ error: "Invalid request origin." }, 403);
  }
  const row = await getDesign(params.id);
  if (!row) return json({ error: "Design not found." }, 404);
  if (supabaseConfigured() && row.ownerId) {
    const user = await userFromRequest(request);
    if (!user || user.id !== row.ownerId) {
      return json({ error: "Design not found or access denied." }, 404);
    }
  }
  if (row.status === "generating") {
    return json(
      { error: "Please wait for generation to finish before deleting." },
      409
    );
  }
  await deleteDesign(params.id);
  return json({ deleted: true });
}
