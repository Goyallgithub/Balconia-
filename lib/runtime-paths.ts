import path from "path";
import { promises as fs } from "fs";

/** Vercel / Lambda only allow writes under /tmp. */
export function isServerlessRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/** Writable root for ephemeral local JSON / files. */
export function dataRoot(...parts: string[]): string {
  const base =
    process.env.DESIGN_DATA_DIR?.trim() ||
    (isServerlessRuntime()
      ? path.join("/tmp", "balconia-data")
      : path.join(process.cwd(), "data"));
  return path.join(base, ...parts);
}

export async function ensureDataDir(...parts: string[]): Promise<string> {
  const dir = dataRoot(...parts);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}
