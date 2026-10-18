import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Safe browser config (anon key only). */
export async function GET() {
  return NextResponse.json(
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      maxGenerations: Number(process.env.MAX_GENERATIONS_PER_USER || "10"),
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
    },
    { headers: { "Cache-Control": "public, max-age=60" } }
  );
}
