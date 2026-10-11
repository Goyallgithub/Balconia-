/**
 * Leonardo.AI REST helpers — nano-banana-2.
 * Docs: https://docs.leonardo.ai/docs/nano-banana-2
 * Upload: https://docs.leonardo.ai/docs/how-to-upload-an-image-using-a-presigned-url
 */

const API = "https://cloud.leonardo.ai/api/rest";

function authHeaders() {
  const key = process.env.LEONARDO_API_KEY;
  if (!key) throw new Error("LEONARDO_API_KEY is not configured");
  return {
    accept: "application/json",
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
  };
}

export async function uploadInitImage(
  bytes: Buffer,
  extension: "jpg" | "png" | "webp"
): Promise<string> {
  const initRes = await fetch(`${API}/v1/init-image`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ extension }),
  });
  if (!initRes.ok) {
    throw new Error(`Leonardo upload init failed (${initRes.status})`);
  }
  const initJson = (await initRes.json()) as {
    uploadInitImage: { id: string; url: string; fields: string };
  };
  const { id, url, fields: fieldsRaw } = initJson.uploadInitImage;
  const fields = JSON.parse(fieldsRaw) as Record<string, string>;

  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const blob = new Blob([new Uint8Array(bytes)], {
    type:
      extension === "png"
        ? "image/png"
        : extension === "webp"
          ? "image/webp"
          : "image/jpeg",
  });
  form.append("file", blob, `ref.${extension}`);

  const up = await fetch(url, { method: "POST", body: form });
  if (!up.ok && up.status !== 204) {
    throw new Error(`Leonardo S3 upload failed (${up.status})`);
  }
  return id;
}

export type RefImage = { id: string; strength: "LOW" | "MID" | "HIGH" };

export async function createNanoBanana2Generation(input: {
  prompt: string;
  references: RefImage[];
}): Promise<string> {
  const payload = {
    model: "nano-banana-2",
    parameters: {
      width: 1024,
      height: 1024,
      prompt: input.prompt,
      quantity: 1,
      prompt_enhance: "OFF",
      style_ids: ["7c3f932b-a572-47cb-9b9b-f20211e63b5b"], // Pro Color Photography
      guidances: {
        image_reference: input.references.map((r) => ({
          image: { id: r.id, type: "UPLOADED" },
          strength: r.strength,
        })),
      },
    },
    public: false,
  };

  const res = await fetch(`${API}/v2/generations`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Leonardo generate failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    generate?: { generationId?: string };
    generationId?: string;
  };
  const id = json.generate?.generationId || json.generationId;
  if (!id) throw new Error("Leonardo did not return a generation id");
  return id;
}

export async function getGeneration(generationId: string): Promise<{
  status: string;
  imageUrl: string | null;
}> {
  const res = await fetch(`${API}/v1/generations/${generationId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Leonardo status failed (${res.status})`);
  }
  const json = (await res.json()) as {
    generations_by_pk?: {
      status?: string;
      generated_images?: Array<{ url?: string }>;
    };
  };
  const gen = json.generations_by_pk;
  const status = (gen?.status || "PENDING").toUpperCase();
  const imageUrl = gen?.generated_images?.[0]?.url || null;
  return { status, imageUrl };
}

export async function pollGeneration(
  generationId: string,
  opts: { maxAttempts?: number; delayMs?: number } = {}
): Promise<string> {
  const maxAttempts = opts.maxAttempts ?? 24;
  const delayMs = opts.delayMs ?? 5000;
  for (let i = 0; i < maxAttempts; i++) {
    const { status, imageUrl } = await getGeneration(generationId);
    if ((status === "COMPLETE" || status === "FINISHED") && imageUrl) {
      return imageUrl;
    }
    if (status === "FAILED") {
      throw new Error("Leonardo generation failed");
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("Leonardo generation timed out");
}

export async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not download Leonardo result");
  return Buffer.from(await res.arrayBuffer());
}
