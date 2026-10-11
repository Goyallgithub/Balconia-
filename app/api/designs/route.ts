import { NextResponse } from "next/server";
import sharp from "sharp";
import products from "@/lib/shop-data.json";
import { planBalcony } from "@/lib/design-plan.mjs";
import {
  countDesignsSince,
  designPublicResult,
  findByRequestId,
  saveDesign,
} from "@/lib/design-store";

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

export async function GET() {
  return json({
    generationAvailable: Boolean(process.env.LEONARDO_API_KEY),
  });
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return json({ error: "Invalid request origin." }, 403);
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

    const existing = await findByRequestId(requestId);
    if (existing) return json(designPublicResult(existing), 200);

    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    if ((await countDesignsSince(dayAgo)) >= 40) {
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

    // Compress / normalize large uploads server-side
    const compressed = await sharp(raw)
      .rotate()
      .resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const answers = JSON.parse(String(form.get("answers") || "{}"));
    const plan = planBalcony(answers, products);

    const record = await saveDesign({
      requestId,
      answers: plan.answers as Record<string, unknown>,
      plan,
      photo: compressed,
      mime: "image/webp",
    });

    return json(designPublicResult(record), 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    const client = /Please|Invalid|check your/i.test(message);
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
