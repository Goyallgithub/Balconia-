import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Please enter your password." }, { status: 400 });
    }

    if (supabaseConfigured()) {
      const admin = supabaseAdmin();
      const { data, error } = await admin.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        return NextResponse.json(
          { error: error?.message || "Invalid email or password." },
          { status: 401 }
        );
      }

      return NextResponse.json({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
        token_type: data.session.token_type,
        user: data.user,
      });
    } else {
      // Offline / Test environment fallback
      if (password.length < 6) {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }
      const userId = `user_${email.split("@")[0].replace(/\W/g, "")}`;
      return NextResponse.json({
        access_token: `test-token-${userId}`,
        refresh_token: `test-refresh-${userId}`,
        user: { id: userId, email },
      });
    }
  } catch (e) {
    console.error("signin error:", e);
    const message = e instanceof Error ? e.message : "Sign in failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
