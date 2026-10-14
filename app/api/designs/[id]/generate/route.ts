import path from "path";
import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import sharp from "sharp";
import products from "@/lib/shop-data.json";
import {
  createNanoBanana2Generation,
  downloadImage,
  pollGeneration,
  uploadInitImage,
} from "@/lib/leonardo";
import { editBalconyWithOpenAI } from "@/lib/openai-image";
import { resolveImageProvider } from "@/lib/image-provider";
import { buildMakeoverPrompt } from "@/lib/prompt";
import {
  loadHeroProductRefs,
  referenceMapPrompt,
} from "@/lib/product-refs";
import {
  assertUserCanGenerate,
  countCompletedGenerationsForUser,
  designPublicResult,
  getDesign,
  readDesignBytes,
  updateDesign,
  writeDesignRender,
} from "@/lib/design-store";
import {
  MAX_GENERATIONS_PER_USER,
  supabaseConfigured,
  userFromRequest,
} from "@/lib/supabase";

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
type Product = { id: string; images?: Array<{ src: string }> };

async function toJpeg(bytes: Buffer, max = 1536): Promise<Buffer> {
  return sharp(bytes)
    .rotate()
    .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
}

export async function POST(request: Request, { params }: Ctx) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Invalid request origin." }, 403);
  }

  const provider = resolveImageProvider();
  if (!provider) {
    return json(
      {
        error:
          "Personalised AI rendering is not enabled yet. Your original photo and product estimate are saved.",
        code: "generation_not_configured",
      },
      503
    );
  }

  const row = await getDesign(params.id);
  if (!row) return json({ error: "Design not found." }, 404);

  if (supabaseConfigured() && row.ownerId) {
    const user = await userFromRequest(request);
    if (!user || user.id !== row.ownerId) {
      return json(
        { error: "Please sign in to generate your image.", code: "auth_required" },
        401
      );
    }
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
      budgetTier?: number;
      subtotalPaise?: number;
      targetPaise?: number;
    };
    const originalBytes = await readDesignBytes(row, "original");
    if (!originalBytes) throw new Error("missing_photo");

    const heroRefs = await loadHeroProductRefs(plan.items || [], 8);
    const prompt = buildMakeoverPrompt(
      plan as unknown as Parameters<typeof buildMakeoverPrompt>[0],
      referenceMapPrompt(heroRefs)
    );

    let resultBytes: Buffer;
    if (provider === "openai") {
      const balconyJpeg = await toJpeg(originalBytes, 1536);
      resultBytes = await editBalconyWithOpenAI({
        balconyJpeg,
        productJpegs: heroRefs.map((r) => r.jpeg),
        prompt,
      });
    } else {
      const balconyId = await uploadInitImage(originalBytes, "webp");
      const refs: Array<{ id: string; strength: "LOW" | "MID" | "HIGH" }> = [
        { id: balconyId, strength: "HIGH" },
      ];
      for (const hero of heroRefs.slice(0, 5)) {
        const id = await uploadInitImage(hero.jpeg, "jpg");
        refs.push({ id, strength: "MID" });
      }
      // Fallback if hero load failed
      if (refs.length === 1) {
        const catalog = products as Product[];
        for (const item of (plan.items || []).slice(0, 5)) {
          const p = catalog.find((x) => x.id === item.id);
          const src = p?.images?.[0]?.src;
          if (!src) continue;
          try {
            const buf = await fs.readFile(path.join(process.cwd(), "public", src));
            const id = await uploadInitImage(await toJpeg(buf, 1024), "jpg");
            refs.push({ id, strength: "MID" });
          } catch {
            // skip
          }
        }
      }
      const generationId = await createNanoBanana2Generation({
        prompt,
        references: refs,
      });
      await updateDesign(row.id, { leonardoGenerationId: generationId });
      const imageUrl = await pollGeneration(generationId, {
        maxAttempts: 24,
        delayMs: 5000,
      });
      resultBytes = await downloadImage(imageUrl);
    }

    const webp = await sharp(resultBytes).webp({ quality: 90 }).toBuffer();
    const outputPath = await writeDesignRender(row, webp);
    const updated = await updateDesign(row.id, {
      status: "complete",
      outputPath,
      lastError: null,
    });
    const out = designPublicResult(updated!) as ReturnType<
      typeof designPublicResult
    > & { referenceCount?: number };
    if (row.ownerId && supabaseConfigured()) {
      const used = await countCompletedGenerationsForUser(row.ownerId);
      out.generationsRemaining =
        MAX_GENERATIONS_PER_USER <= 0
          ? null
          : Math.max(0, MAX_GENERATIONS_PER_USER - used);
    }
    out.referenceCount = heroRefs.length;
    return json(out);
  } catch (e) {
    const message = e instanceof Error ? e.message : "provider_failed";
    await updateDesign(row.id, { status: "failed", lastError: message });
    return json(
      {
        error: `We could not create the personalised image (${message}). Your photo and estimate are saved.`,
        detail: message,
        provider,
      },
      503
    );
  }
}
