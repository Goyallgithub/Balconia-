import { promises as fs } from "fs";
import path from "path";
import { dataRoot, ensureDataDir, isServerlessRuntime } from "@/lib/runtime-paths";
import { supabaseConfigured } from "@/lib/supabase";

const API = "https://api.openai.com/v1/images/edits";

const USAGE_FILE = () => path.join(dataRoot("designs"), "_openai_usage.json");

type UsageState = { count: number; updatedAt: string };

/** Local demo only — production uses per-user caps in Supabase. */
function localOpenAiBudgetEnabled(): boolean {
  if (isServerlessRuntime()) return false;
  if (supabaseConfigured()) return false;
  const max = Number(process.env.OPENAI_IMAGE_MAX_GENERATIONS || "2");
  return Number.isFinite(max) && max > 0;
}

async function readUsage(): Promise<UsageState> {
  try {
    return JSON.parse(await fs.readFile(USAGE_FILE(), "utf8")) as UsageState;
  } catch {
    return { count: 0, updatedAt: new Date().toISOString() };
  }
}

async function bumpUsage(): Promise<void> {
  if (!localOpenAiBudgetEnabled()) return;
  const prev = await readUsage();
  const next = { count: prev.count + 1, updatedAt: new Date().toISOString() };
  await ensureDataDir("designs");
  await fs.writeFile(USAGE_FILE(), JSON.stringify(next, null, 2));
}

export async function assertOpenAiBudget(): Promise<void> {
  if (!localOpenAiBudgetEnabled()) return;
  const max = Number(process.env.OPENAI_IMAGE_MAX_GENERATIONS || "2");
  const { count } = await readUsage();
  if (count >= max) {
    throw new Error(
      `Local OpenAI demo cap reached (${count}/${max} images). Raise OPENAI_IMAGE_MAX_GENERATIONS only if you accept more spend.`
    );
  }
}

export async function editBalconyWithOpenAI(input: {
  balconyJpeg: Buffer;
  prompt: string;
  productJpegs?: Buffer[];
}): Promise<Buffer> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  await assertOpenAiBudget();

  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-sunburst";
  const quality = process.env.OPENAI_IMAGE_QUALITY || "high";
  const size = process.env.OPENAI_IMAGE_SIZE || "1024x1536";
  const fidelity = process.env.OPENAI_IMAGE_INPUT_FIDELITY || "high";

  const buildForm = (withFidelity: boolean) => {
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", input.prompt.slice(0, 32000));
    form.append("quality", quality);
    form.append("size", size);
    form.append("n", "1");
    if (withFidelity && (fidelity === "high" || fidelity === "low")) {
      form.append("input_fidelity", fidelity);
    }
    form.append(
      "image[]",
      new Blob([new Uint8Array(input.balconyJpeg)], { type: "image/jpeg" }),
      "01-balcony.jpg"
    );
    for (const [i, buf] of (input.productJpegs || []).slice(0, 8).entries()) {
      form.append(
        "image[]",
        new Blob([new Uint8Array(buf)], { type: "image/jpeg" }),
        `${String(i + 2).padStart(2, "0")}-product.jpg`
      );
    }
    return form;
  };

  const post = async (withFidelity: boolean) => {
    const res = await fetch(API, {
      method: "POST",
      headers: { authorization: `Bearer ${key}` },
      body: buildForm(withFidelity),
    });
    const json = (await res.json().catch(() => null)) as {
      error?: { message?: string };
      data?: Array<{ b64_json?: string; url?: string }>;
    } | null;
    return { res, json };
  };

  let { res, json } = await post(true);
  // Some models reject input_fidelity — retry once without it
  if (
    !res.ok &&
    /input_fidelity|unknown parameter|unsupported/i.test(
      json?.error?.message || ""
    )
  ) {
    ({ res, json } = await post(false));
  }

  if (!res.ok) {
    throw new Error(
      json?.error?.message || `OpenAI image edit failed (${res.status})`
    );
  }

  const b64 = json?.data?.[0]?.b64_json;
  if (b64) {
    await bumpUsage();
    return Buffer.from(b64, "base64");
  }
  const url = json?.data?.[0]?.url;
  if (url) {
    const img = await fetch(url);
    if (!img.ok) throw new Error("Could not download OpenAI result");
    await bumpUsage();
    return Buffer.from(await img.arrayBuffer());
  }
  throw new Error("OpenAI did not return an image");
}
