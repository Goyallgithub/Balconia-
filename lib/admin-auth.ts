import crypto from "crypto";
import { userFromRequest } from "@/lib/supabase";

const DEFAULT_ADMIN_SECRET = "balconia-admin-2026";
const COOKIE_NAME = "balconia_admin_token";

export function getAdminSecret(): string {
  return process.env.ADMIN_SECRET_KEY?.trim() || DEFAULT_ADMIN_SECRET;
}

export function getAdminEmails(): string[] {
  const envList = process.env.ADMIN_EMAILS || "";
  const opsEmail = process.env.ORDER_EMAIL_OPS || "";
  const defaults = ["goyallbhavy@gmail.com", "baygoyal10@gmail.com", "care@balconia.in"];
  const combined = [
    ...defaults,
    ...envList.split(",").map((e) => e.trim().toLowerCase()),
    ...opsEmail.split(",").map((e) => e.trim().toLowerCase()),
  ].filter(Boolean);
  return Array.from(new Set(combined));
}

/** Generate a signed admin token containing timestamp */
export function generateAdminSessionToken(): string {
  const secret = getAdminSecret();
  const timestamp = Date.now().toString();
  const hash = crypto
    .createHmac("sha256", secret)
    .update(`balconia-admin-session-${timestamp}`)
    .digest("hex");
  return `${timestamp}.${hash}`;
}

/** Verify a signed admin session token */
export function verifyAdminSessionToken(token: string): boolean {
  if (!token || !token.includes(".")) return false;
  const [timestampStr, hash] = token.split(".");
  const timestamp = Number(timestampStr);
  if (!timestamp || isNaN(timestamp)) return false;

  // Session lasts 7 days
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - timestamp > maxAge) return false;

  const secret = getAdminSecret();
  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(`balconia-admin-session-${timestampStr}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  } catch {
    return false;
  }
}

/** Verify if passphrase matches admin secret */
export function verifyPassphrase(passphrase: string): boolean {
  const secret = getAdminSecret();
  if (!passphrase || typeof passphrase !== "string") return false;
  return passphrase.trim() === secret;
}

/**
 * Verify whether an incoming HTTP request is authenticated as an Admin.
 * Checks:
 * 1. x-admin-key header (direct key match)
 * 2. Authorization Bearer token (session token or direct key)
 * 3. Cookie balconia_admin_token
 * 4. Supabase user auth (if user email is an authorized admin)
 */
export async function isRequestAuthorizedAdmin(request: Request): Promise<boolean> {
  const secret = getAdminSecret();

  // 1. Direct header
  const adminKeyHeader = request.headers.get("x-admin-key");
  if (adminKeyHeader && adminKeyHeader.trim() === secret) {
    return true;
  }

  // 2. Authorization header
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (bearer === secret) return true;
    if (verifyAdminSessionToken(bearer)) return true;
  }

  // 3. Cookie
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  if (match && match[1]) {
    const cookieToken = decodeURIComponent(match[1].trim());
    if (cookieToken === secret || verifyAdminSessionToken(cookieToken)) {
      return true;
    }
  }

  // 4. Supabase user auth
  try {
    const user = await userFromRequest(request);
    if (user && user.email) {
      const allowed = getAdminEmails();
      if (allowed.includes(user.email.toLowerCase())) {
        return true;
      }
    }
  } catch {
    // Ignore Supabase auth check error and proceed
  }

  return false;
}

export { COOKIE_NAME };
