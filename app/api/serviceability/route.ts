import { NextResponse } from "next/server";
import {
  CoverageError,
  config,
  resolveCoverage,
} from "@/lib/serviceability.mjs";
import { isValidOrigin } from "@/lib/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requests = new Map<string, { n: number; until: number }>();

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": status === 200 ? "no-store" : "no-store" },
  });
}

export async function GET() {
  return NextResponse.json(
    {
      version: config.version,
      hub: {
        lat: config.hub.lat,
        lng: config.hub.lng,
        name: config.hub.name,
      },
      radiusKm: config.makeoverRadiusKm,
      city: "Delhi NCR",
    },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}

export async function POST(request: Request) {
  if (!isValidOrigin(request)) {
    return json({ error: "Invalid request origin." }, 403);
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anonymous";
  const now = Date.now();
  let limit = requests.get(ip);
  if (!limit || limit.until < now) limit = { n: 0, until: now + 60000 };
  if (++limit.n > 20) {
    return NextResponse.json(
      { error: "Please wait a minute before checking again." },
      { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } }
    );
  }
  if (requests.size > 1000) requests.clear();
  requests.set(ip, limit);

  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      throw new CoverageError("Use JSON.", 415);
    }
    const raw = await request.text();
    if (raw.length > 4000) throw new CoverageError("Request too large.", 413);
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new CoverageError("Invalid location data.", 400);
    }
    const env = {
      ARCGIS_GEOCODING_API_KEY: process.env.ARCGIS_GEOCODING_API_KEY,
    };
    return json(await resolveCoverage(body, env));
  } catch (e) {
    const status = e instanceof CoverageError ? e.status : 503;
    return json(
      { error: e instanceof Error ? e.message : "Location check failed." },
      status
    );
  }
}
