import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

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

export async function saveDesign(input: {
  requestId: string;
  answers: Record<string, unknown>;
  plan: unknown;
  photo: Buffer;
  mime: string;
}): Promise<DesignRecord> {
  await ensureRoot();
  const existing = await findByRequestId(input.requestId);
  if (existing) return existing;

  const id = randomUUID();
  const dir = designDir(id);
  await fs.mkdir(dir, { recursive: true });
  const ext =
    input.mime === "image/png"
      ? "png"
      : input.mime === "image/webp"
        ? "webp"
        : "jpg";
  const originalPath = path.join(dir, `original.${ext}`);
  await fs.writeFile(originalPath, input.photo);

  const record: DesignRecord = {
    id,
    requestId: input.requestId,
    createdAt: new Date().toISOString(),
    answers: input.answers,
    plan: input.plan,
    status: "ready",
    originalPath,
    originalMime: input.mime,
    outputPath: null,
    leonardoGenerationId: null,
    lastError: null,
  };
  await fs.writeFile(metaPath(id), JSON.stringify(record, null, 2));
  return record;
}

export async function getDesign(id: string): Promise<DesignRecord | null> {
  try {
    const raw = await fs.readFile(metaPath(id), "utf8");
    return JSON.parse(raw) as DesignRecord;
  } catch {
    return null;
  }
}

export async function findByRequestId(
  requestId: string
): Promise<DesignRecord | null> {
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
  const current = await getDesign(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  await fs.writeFile(metaPath(id), JSON.stringify(next, null, 2));
  return next;
}

export async function deleteDesign(id: string): Promise<boolean> {
  const dir = designDir(id);
  try {
    await fs.rm(dir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

export async function countDesignsSince(iso: string): Promise<number> {
  await ensureRoot();
  const entries = await fs.readdir(root()).catch(() => [] as string[]);
  let n = 0;
  for (const id of entries) {
    const d = await getDesign(id);
    if (d && d.createdAt > iso) n += 1;
  }
  return n;
}

export function designPublicResult(row: DesignRecord) {
  return {
    id: row.id,
    status: row.status,
    plan: row.plan,
    originalUrl: `/api/designs/${row.id}/image?kind=original`,
    renderUrl: row.outputPath
      ? `/api/designs/${row.id}/image?kind=render`
      : null,
    generationAvailable: Boolean(process.env.LEONARDO_API_KEY),
  };
}
