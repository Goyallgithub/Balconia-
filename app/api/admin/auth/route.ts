import { NextResponse } from "next/server";
import {
  isRequestAuthorizedAdmin,
  verifyPassphrase,
  generateAdminSessionToken,
  COOKIE_NAME,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** Check current admin authentication status */
export async function GET(request: Request) {
  const isAuth = await isRequestAuthorizedAdmin(request);
  return NextResponse.json({ authenticated: isAuth });
}

/** Log in to admin dashboard with passphrase */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const passphrase = String(body.passphrase || "").trim();

    if (!verifyPassphrase(passphrase)) {
      return NextResponse.json(
        { error: "Invalid admin passphrase. Access denied." },
        { status: 401 }
      );
    }

    const token = generateAdminSessionToken();
    const response = NextResponse.json({
      ok: true,
      message: "Authenticated successfully",
      token,
    });

    // Set secure cookie for 7 days
    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("POST /api/admin/auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}

/** Log out from admin dashboard */
export async function DELETE() {
  const response = NextResponse.json({ ok: true, message: "Logged out" });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
