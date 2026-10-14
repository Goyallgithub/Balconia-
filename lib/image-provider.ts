export type ImageProvider = "openai" | "leonardo";

export function resolveImageProvider(): ImageProvider | null {
  const forced = (process.env.IMAGE_PROVIDER || "").toLowerCase().trim();
  if (forced === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (forced === "leonardo" && process.env.LEONARDO_API_KEY) return "leonardo";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.LEONARDO_API_KEY) return "leonardo";
  return null;
}

export function generationAvailable(): boolean {
  return resolveImageProvider() !== null;
}
