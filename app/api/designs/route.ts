import { NextResponse } from "next/server";
import sharp from "sharp";
import products from "@/lib/shop-data.json";
import { planBalcony } from "@/lib/design-plan.mjs";
import {
  assertUserCanGenerate,
  countCompletedGenerationsForUser,
  countDesignsSince,
  designPublicResult,
  findByRequestId,
  saveDesign,
} from "@/lib/design-store";
import { generationAvailable } from "@/lib/image-provider";
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

function sniffMime(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "image/png";
  const head = Buffer.from(bytes.slice(0, 12)).toString("ascii");
  if (head.startsWith("RIFF") && head.includes("WEBP")) return "image/webp";
  return null;
}

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  let generationsRemaining: number | null = null;
  if (user) {
    const used = await countCompletedGenerationsForUser(user.id);
    generationsRemaining = MAX_GENERATIONS_PER_USER <= 0 ? null : Math.max(0, MAX_GENERATIONS_PER_USER - used);
  }
  return json({
    generationAvailable: generationAvailable(),
    authRequired: supabaseConfigured(),
    signedIn: Boolean(user),
    generationsRemaining,
    maxGenerations: MAX_GENERATIONS_PER_USER,
  });
}

export async function POST(request: Request) {
  try {
    if (!isValidOrigin(request)) {
      return json({ error: "Invalid request origin." }, 403);
    }

    const user = await userFromRequest(request);
    if (supabaseConfigured() && !user) {
      return json(
        {
          error: "Please sign in to save your balcony photo and create a design.",
          code: "auth_required",
          signInUrl: "/#account",
        },
        401
      );
    }

    const form = await request.formData();
    const consent = String(form.get("consent") || "");
    if (consent !== "yes") {
      return json(
        {
          error:
            "Please consent to saving your photo and sending it for AI design when enabled.",
        },
        400
      );
    }

    const requestId = String(form.get("requestId") || "");
    if (!/^[a-f0-9-]{36}$/i.test(requestId)) {
      return json({ error: "Invalid request reference." }, 400);
    }

    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined;

    const existing = await findByRequestId(requestId, user?.id);
    if (existing) {
      const out = designPublicResult(existing, token);
      if (user) {
        const used = await countCompletedGenerationsForUser(user.id);
        out.generationsRemaining = MAX_GENERATIONS_PER_USER <= 0 ? null : Math.max(0, MAX_GENERATIONS_PER_USER - used);
      }
      return json(out, 200);
    }

    // Soft check: creating a design that will auto-generate needs remaining quota
    if (user && generationAvailable()) {
      try {
        await assertUserCanGenerate(user.id);
      } catch (e) {
        return json(
          {
            error: e instanceof Error ? e.message : "Generation limit reached.",
            code: "generation_limit",
          },
          429
        );
      }
    }

    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const maxDaily = Number(process.env.DAILY_DESIGN_LIMIT || "500");
    if ((await countDesignsSince(dayAgo)) >= maxDaily) {
      return json(
        {
          error:
            "Daily design limit reached for this server. Please try again tomorrow.",
        },
        429
      );
    }

    const photo = form.get("photo");
    if (!(photo instanceof File) || photo.size < 256 || photo.size > 8 * 1024 * 1024) {
      return json(
        { error: "Please upload a JPEG, PNG or WebP image under 8 MB." },
        400
      );
    }

    const raw = Buffer.from(await photo.arrayBuffer());
    const mime = sniffMime(raw);
    if (!mime) {
      return json(
        {
          error:
            "Please use JPEG, PNG or WebP. SVG and other file types are not supported.",
        },
        400
      );
    }

    const compressed = await sharp(raw)
      .rotate()
      .resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const answers = JSON.parse(String(form.get("answers") || "{}"));
    const plan = planBalcony(answers, products);

    const record = await saveDesign({
      requestId,
      answers: plan.answers as unknown as Record<string, unknown>,
      plan,
      photo: compressed,
      mime: "image/webp",
      ownerId: user?.id || null,
    });

    const out = designPublicResult(record, token);
    if (user) {
      const used = await countCompletedGenerationsForUser(user.id);
      out.generationsRemaining = MAX_GENERATIONS_PER_USER <= 0 ? null : Math.max(0, MAX_GENERATIONS_PER_USER - used);
    }
    return json(out, 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    const client = /Please|Invalid|check your|catalogue|selection|limit/i.test(message);
    return json(
      {
        error: client
          ? message
          : "We could not save the design. Please try again.",
      },
      client ? 400 : 503
    );
  }
}
