import { promises as fs } from "fs";
import path from "path";

const root = () =>
  path.join(
    process.env.DESIGN_DATA_DIR || path.join(process.cwd(), "data"),
    "orders"
  );

async function ensure() {
  await fs.mkdir(root(), { recursive: true });
}

export async function saveJsonRecord(
  folder: "orders" | "consultations",
  id: string,
  record: unknown
) {
  const dir = path.join(
    process.env.DESIGN_DATA_DIR || path.join(process.cwd(), "data"),
    folder
  );
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, `${id}.json`),
    JSON.stringify(record, null, 2)
  );
}

export async function findByRequestId(
  folder: "orders" | "consultations",
  requestId: string
): Promise<Record<string, unknown> | null> {
  const dir = path.join(
    process.env.DESIGN_DATA_DIR || path.join(process.cwd(), "data"),
    folder
  );
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir).catch(() => [] as string[]);
  for (const name of entries) {
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

export { ensure as ensureOrdersDir };
