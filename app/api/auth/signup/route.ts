import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Soft-launch signup: create the user as already confirmed via service role.
 * Avoids Supabase Auth confirmation emails (and their rate limits).
 */
export async function POST(request: Request) {
  try {
    if (!supabaseConfigured()) {
      return NextResponse.json(
        { error: "Auth is not configured." },
        { status: 503 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      email?: string;
      password?: string;
    } | null;

    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(body?.password || "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError) {
      const msg = createError.message || "Could not create account.";
      const status = /already|registered|exists/i.test(msg) ? 409 : 400;
      return NextResponse.json({ error: msg }, { status });
    }

    const { data: session, error: signInError } =
      await admin.auth.signInWithPassword({ email, password });

    if (signInError || !session.session) {
      return NextResponse.json(
        {
          error:
            "Account created. Please sign in with your email and password.",
          user: created.user,
        },
        { status: 201 }
      );
    }

    return NextResponse.json({
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
      expires_in: session.session.expires_in,
      expires_at: session.session.expires_at,
      token_type: session.session.token_type,
      user: session.user,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
