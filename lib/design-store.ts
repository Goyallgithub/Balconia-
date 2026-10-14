import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { generationAvailable } from "@/lib/image-provider";
import {
  MAX_GENERATIONS_PER_USER,
  supabaseAdmin,
  supabaseConfigured,
} from "@/lib/supabase";

export type DesignRecord = {
  id: string;
  requestId: string;
  createdAt: string;
  answers: Record<string, unknown>;
  plan: unknown;
  status: "ready" | "generating" | "complete" | "failed";
  originalPath: string;
  originalMime: string;
  outputPath: string | null;
  leonardoGenerationId: string | null;
  lastError: string | null;
  ownerId?: string | null;
};

const root = () =>
  path.join(
    process.env.DESIGN_DATA_DIR || path.join(process.cwd(), "data", "designs")
  );

async function ensureRoot() {
  await fs.mkdir(root(), { recursive: true });
}

function designDir(id: string) {
  return path.join(root(), id);
}

function metaPath(id: string) {
  return path.join(designDir(id), "meta.json");
}

function pick(row: Record<string, unknown>, snake: string, camel: string) {
  const v = row[snake] ?? row[camel];
  return v == null || v === "" ? null : String(v);
}

function rowFromDb(row: Record<string, unknown>): DesignRecord {
  return {
    id: String(row.id),
    requestId: String(row.request_id ?? row.requestId),
    createdAt: String(row.created_at ?? row.createdAt),
    answers: (row.answers || {}) as Record<string, unknown>,
    plan: row.plan,
    status: (row.status as DesignRecord["status"]) || "ready",
    originalPath: pick(row, "original_path", "originalPath") || "",
    originalMime: pick(row, "original_mime", "originalMime") || "image/webp",
    outputPath: pick(row, "output_path", "outputPath"),
    leonardoGenerationId: pick(
      row,
      "leonardo_generation_id",
      "leonardoGenerationId"
    ),
    lastError: pick(row, "last_error", "lastError"),
    ownerId: pick(row, "owner_id", "ownerId"),
  };
}

export async function countCompletedGenerationsForUser(
  ownerId: string
): Promise<number> {
  if (!supabaseConfigured()) return 0;
  const { count, error } = await supabaseAdmin()
    .from("balcony_designs")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .eq("status", "complete");
  if (error) throw new Error(error.message);
  return count || 0;
}

export async function assertUserCanGenerate(ownerId: string): Promise<void> {
  // MAX_GENERATIONS_PER_USER <= 0 means unlimited (local testing)
  if (MAX_GENERATIONS_PER_USER <= 0) return;
  const used = await countCompletedGenerationsForUser(ownerId);
  if (used >= MAX_GENERATIONS_PER_USER) {
    throw new Error(
      `You have used your ${MAX_GENERATIONS_PER_USER} personalised AI images. Contact Balconia if you need another concept.`
    );
  }
}

export async function saveDesign(input: {
  requestId: string;
  answers: Record<string, unknown>;
  plan: unknown;
  photo: Buffer;
  mime: string;
  ownerId?: string | null;
}): Promise<DesignRecord> {
  const existing = await findByRequestId(input.requestId, input.ownerId);
  if (existing) return existing;

  if (supabaseConfigured() && input.ownerId) {
    const id = randomUUID();
    const key = `${input.ownerId}/${id}/original.webp`;
    const admin = supabaseAdmin();
    const up = await admin.storage
      .from("balcony-designs")
      .upload(key, input.photo, { contentType: "image/webp", upsert: false });
    if (up.error) throw new Error(up.error.message);

    const { data, error } = await admin
      .from("balcony_designs")
      .insert({
        id,
        owner_id: input.ownerId,
        request_id: input.requestId,
        answers: input.answers,
        plan: input.plan,
        original_path: key,
        original_mime: "image/webp",
        status: "ready",
      })
      .select("*")
      .single();
    if (error) {
      await admin.storage.from("balcony-designs").remove([key]);
      throw new Error(error.message);
    }
    return rowFromDb(data as Record<string, unknown>);
  }

  await ensureRoot();
  const id = randomUUID();
  const dir = designDir(id);
  await fs.mkdir(dir, { recursive: true });
  const originalPath = path.join(dir, "original.webp");
  await fs.writeFile(originalPath, input.photo);
  const record: DesignRecord = {
    id,
    requestId: input.requestId,
    createdAt: new Date().toISOString(),
    answers: input.answers,
    plan: input.plan,
    status: "ready",
    originalPath,
    originalMime: "image/webp",
    outputPath: null,
    leonardoGenerationId: null,
    lastError: null,
    ownerId: input.ownerId || null,
  };
  await fs.writeFile(metaPath(id), JSON.stringify(record, null, 2));
  return record;
}

export async function getDesign(id: string): Promise<DesignRecord | null> {
  if (supabaseConfigured()) {
    const { data, error } = await supabaseAdmin()
      .from("balcony_designs")
      .select(
        "id,owner_id,request_id,created_at,answers,plan,original_path,original_mime,output_path,status,leonardo_generation_id,last_error"
      )
      .eq("id", id)
      .maybeSingle();
    if (error) console.error("getDesign supabase error", error.message);
    if (data) {
      const mapped = rowFromDb(data as Record<string, unknown>);
      if (!mapped.outputPath && (data as { output_path?: string }).output_path) {
        mapped.outputPath = String(
          (data as { output_path: string }).output_path
        );
      }
      return mapped;
    }
  }
  try {
    const raw = await fs.readFile(metaPath(id), "utf8");
    return JSON.parse(raw) as DesignRecord;
  } catch {
    return null;
  }
}

export async function findByRequestId(
  requestId: string,
  ownerId?: string | null
): Promise<DesignRecord | null> {
  if (supabaseConfigured() && ownerId) {
    const { data } = await supabaseAdmin()
      .from("balcony_designs")
      .select("*")
      .eq("request_id", requestId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (data) return rowFromDb(data as Record<string, unknown>);
    return null;
  }
  await ensureRoot();
  const entries = await fs.readdir(root()).catch(() => [] as string[]);
  for (const id of entries) {
    const d = await getDesign(id);
    if (d?.requestId === requestId) return d;
  }
  return null;
}

export async function updateDesign(
  id: string,
  patch: Partial<DesignRecord>
): Promise<DesignRecord | null> {
  if (supabaseConfigured()) {
    const dbPatch: Record<string, unknown> = {};
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.outputPath !== undefined) dbPatch.output_path = patch.outputPath;
    if (patch.lastError !== undefined) dbPatch.last_error = patch.lastError;
    if (patch.leonardoGenerationId !== undefined)
      dbPatch.leonardo_generation_id = patch.leonardoGenerationId;
    if (patch.plan !== undefined) dbPatch.plan = patch.plan;
    if (patch.answers !== undefined) dbPatch.answers = patch.answers;
    const { data, error } = await supabaseAdmin()
      .from("balcony_designs")
      .update(dbPatch)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowFromDb(data as Record<string, unknown>) : null;
  }
  const current = await getDesign(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  await fs.writeFile(metaPath(id), JSON.stringify(next, null, 2));
  return next;
}

export async function deleteDesign(id: string): Promise<boolean> {
  const row = await getDesign(id);
  if (!row) return false;
  if (supabaseConfigured() && row.originalPath && !row.originalPath.startsWith("/")) {
    const keys = [row.originalPath, ...(row.outputPath ? [row.outputPath] : [])];
    await supabaseAdmin().storage.from("balcony-designs").remove(keys);
    await supabaseAdmin().from("balcony_designs").delete().eq("id", id);
    return true;
  }
  try {
    await fs.rm(designDir(id), { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

export async function countDesignsSince(iso: string): Promise<number> {
  if (supabaseConfigured()) {
    const { count } = await supabaseAdmin()
      .from("balcony_designs")
      .select("id", { count: "exact", head: true })
      .gt("created_at", iso);
    return count || 0;
  }
  await ensureRoot();
  const entries = await fs.readdir(root()).catch(() => [] as string[]);
  let n = 0;
  for (const id of entries) {
    const d = await getDesign(id);
    if (d && d.createdAt > iso) n += 1;
  }
  return n;
}

export async function readDesignBytes(
  row: DesignRecord,
  kind: "original" | "render"
): Promise<Buffer | null> {
  const key = kind === "render" ? row.outputPath : row.originalPath;
  if (!key) {
    console.error("readDesignBytes: missing key", {
      kind,
      id: row.id,
      outputPath: row.outputPath,
      originalPath: row.originalPath,
    });
    return null;
  }
  if (supabaseConfigured() && !key.startsWith("/") && !path.isAbsolute(key)) {
    const { data, error } = await supabaseAdmin()
      .storage.from("balcony-designs")
      .download(key);
    if (error || !data) {
      console.error("readDesignBytes: storage download failed", {
        kind,
        key,
        error: error?.message,
      });
      return null;
    }
    const ab = await data.arrayBuffer();
    return Buffer.from(ab);
  }
  try {
    return await fs.readFile(key);
  } catch (e) {
    console.error("readDesignBytes: fs read failed", { kind, key, e });
    return null;
  }
}

export async function writeDesignRender(
  row: DesignRecord,
  bytes: Buffer
): Promise<string> {
  if (supabaseConfigured() && row.ownerId) {
    const key = `${row.ownerId}/${row.id}/render.webp`;
    const { error } = await supabaseAdmin()
      .storage.from("balcony-designs")
      .upload(key, bytes, { contentType: "image/webp", upsert: true });
    if (error) throw new Error(error.message);
    return key;
  }
  const outputPath = path.join(path.dirname(row.originalPath), "render.webp");
  await fs.writeFile(outputPath, bytes);
  return outputPath;
}

export function designPublicResult(row: DesignRecord) {
  return {
    id: row.id,
    status: row.status,
    plan: row.plan,
    answers: row.answers,
    originalUrl: `/api/designs/${row.id}/image?kind=original`,
    renderUrl: row.outputPath
      ? `/api/designs/${row.id}/image?kind=render`
      : null,
    generationAvailable: generationAvailable(),
    lastError: row.status === "failed" ? row.lastError : null,
    generationsRemaining: null as number | null,
  };
}
