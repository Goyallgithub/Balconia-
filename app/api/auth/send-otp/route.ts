import { NextResponse } from "next/server";
import { initiateOtpRegistration, type VerifyMethod } from "@/lib/auth-otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const { fullName, email, phone, password, confirmPassword, verifyMethod } = body;

    const isTest = request.headers.get("x-balconia-test") === "true" || process.env.NODE_ENV === "test";
    const result = await initiateOtpRegistration({
      fullName,
      email,
      phone,
      password,
      confirmPassword,
      verifyMethod: (verifyMethod as VerifyMethod) || "email",
      isTest,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      {
        success: true,
        verificationToken: result.verificationToken,
        destination: result.destination,
        verifyMethod,
        cooldownSeconds: result.cooldownSeconds,
        expiresInSeconds: result.expiresInSeconds,
        ...(result.sandboxNotice ? { sandboxNotice: result.sandboxNotice, devOtp: result.otp } : {}),
        ...(isTest && result.otp ? { debugOtp: result.otp } : {}),
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("send-otp error:", e);
    const message = e instanceof Error ? e.message : "Failed to initiate registration.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
