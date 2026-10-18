import { NextResponse } from "next/server";
import { resendOtp } from "@/lib/auth-otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.verificationToken) {
      return NextResponse.json({ error: "Verification token is required." }, { status: 400 });
    }

    const isTest = request.headers.get("x-balconia-test") === "true" || process.env.NODE_ENV === "test";
    const result = await resendOtp({
      verificationToken: String(body.verificationToken),
      isTest,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      {
        success: true,
        destination: result.destination,
        cooldownSeconds: result.cooldownSeconds,
        ...(result.sandboxNotice ? { sandboxNotice: result.sandboxNotice, devOtp: result.otp } : {}),
        ...(isTest && result.otp ? { debugOtp: result.otp } : {}),
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("resend-otp error:", e);
    const message = e instanceof Error ? e.message : "Failed to resend verification code.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
