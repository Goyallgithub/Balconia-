import { promises as fs } from "fs";
import path from "path";
import { dataRoot, ensureDataDir } from "@/lib/runtime-paths";

const root = () => dataRoot("orders");

async function ensure() {
  await ensureDataDir("orders");
}

export async function saveJsonRecord(
  folder: "orders" | "consultations",
  id: string,
  record: unknown
) {
  const dir = await ensureDataDir(folder);
  await fs.writeFile(
    path.join(dir, `${id}.json`),
    JSON.stringify(record, null, 2)
  );
}

export async function findByRequestId(
  folder: "orders" | "consultations",
  requestId: string
): Promise<Record<string, unknown> | null> {
  const dir = await ensureDataDir(folder);
  const entries = await fs.readdir(dir).catch(() => [] as string[]);  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    try {
      const raw = JSON.parse(
        await fs.readFile(path.join(dir, name), "utf8")
      ) as Record<string, unknown>;
      if (raw.requestId === requestId) return raw;
    } catch {
      // skip
    }
  }
  return null;
}

export async function getOrderById(id: string): Promise<Record<string, unknown> | null> {
  const dir = await ensureDataDir("orders");
  const filePath = path.join(dir, `${id}.json`);
  try {
    const raw = JSON.parse(await fs.readFile(filePath, "utf8")) as Record<string, unknown>;
    return raw;
  } catch {
    return null;
  }
}

export { ensure as ensureOrdersDir };
