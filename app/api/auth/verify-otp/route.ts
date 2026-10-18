import { NextResponse } from "next/server";
import { verifyOtpRegistration } from "@/lib/auth-otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const { verificationToken, otp } = body;
    if (!verificationToken || !otp) {
      return NextResponse.json({ error: "Verification token and 6-digit code are required." }, { status: 400 });
    }

    const result = await verifyOtpRegistration({
      verificationToken: String(verificationToken),
      otp: String(otp),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      {
        success: true,
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        user: result.user,
      },
      { status: result.status || 200 }
    );
  } catch (e) {
    console.error("verify-otp error:", e);
    const message = e instanceof Error ? e.message : "Failed to verify registration.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
