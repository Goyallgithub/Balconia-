import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import products from "@/lib/shop-data.json";
import {
  createNanoBanana2Generation,
  downloadImage,
  pollGeneration,
  uploadInitImage,
} from "@/lib/leonardo";
import { buildMakeoverPrompt } from "@/lib/prompt";
import {
  designPublicResult,
  getDesign,
  updateDesign,
} from "@/lib/design-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

type Ctx = { params: { id: string } };
type Product = {
  id: string;
  images?: Array<{ src: string }>;
};

export async function POST(request: Request, { params }: Ctx) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Invalid request origin." }, 403);
  }

  if (!process.env.LEONARDO_API_KEY) {
    return json(
      {
        error:
          "Personalised AI rendering is not enabled yet. Your original photo and product estimate are saved; you can choose DIY or request a Balconia makeover.",
        code: "generation_not_configured",
      },
      503
    );
  }

  const row = await getDesign(params.id);
  if (!row) return json({ error: "Design not found." }, 404);

  if (row.status === "complete" && row.outputPath) {
    return json(designPublicResult(row));
  }

  if (row.status === "generating") {
    return json(
      {
        error: "This design is already generating. Please wait.",
        code: "already_generating",
      },
      409
    );
  }

  await updateDesign(row.id, { status: "generating", lastError: null });

  try {
    const plan = row.plan as {
      answers: Record<string, unknown>;
      items: Array<{ id: string; quantity: number; name: string; size?: string }>;
      notes: string[];
    };

    const originalBytes = await fs.readFile(row.originalPath);
    const balconyId = await uploadInitImage(originalBytes, "webp");

    const refs: Array<{ id: string; strength: "LOW" | "MID" | "HIGH" }> = [
      { id: balconyId, strength: "HIGH" },
    ];

    const catalog = products as Product[];
    for (const item of plan.items.slice(0, 5)) {
      const p = catalog.find((x) => x.id === item.id);
      const src = p?.images?.[0]?.src;
      if (!src) continue;
      const abs = path.join(process.cwd(), "public", src);
      try {
        const buf = await fs.readFile(abs);
        const jpg = await sharp(buf)
          .rotate()
          .resize({ width: 1024, height: 1024, fit: "inside" })
          .jpeg({ quality: 85 })
          .toBuffer();
        const id = await uploadInitImage(jpg, "jpg");
        refs.push({ id, strength: "MID" });
      } catch {
        // skip missing product image
      }
    }

    const prompt = buildMakeoverPrompt(plan as unknown as Parameters<typeof buildMakeoverPrompt>[0]);
    const generationId = await createNanoBanana2Generation({
      prompt,
      references: refs,
    });

    await updateDesign(row.id, { leonardoGenerationId: generationId });

    const imageUrl = await pollGeneration(generationId, {
      maxAttempts: 24,
      delayMs: 5000,
    });
    const resultBytes = await downloadImage(imageUrl);
    const outputPath = path.join(
      path.dirname(row.originalPath),
      "render.webp"
    );
    await fs.writeFile(outputPath, resultBytes);

    const updated = await updateDesign(row.id, {
      status: "complete",
      outputPath,
      lastError: null,
    });

    return json(designPublicResult(updated!));
  } catch (e) {
    const message = e instanceof Error ? e.message : "provider_failed";
    await updateDesign(row.id, { status: "failed", lastError: message });
    return json(
      {
        error:
          "We could not create the personalised image. Your photo and estimate are saved. Please try again or request our design service.",
      },
      503
    );
  }
}
