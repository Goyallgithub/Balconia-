/**
 * Validates that an incoming state-changing request originates from the same site.
 * Supports direct access, reverse proxies (X-Forwarded-Host / Proto),
 * and Cloudflare tunnels (*.trycloudflare.com).
 */
export function isValidOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Non-browser / same-origin without Origin header

  const url = new URL(request.url);
  if (origin === url.origin) return true;

  try {
    const originUrl = new URL(origin);

    // 1. Match against forwarded host / headers from reverse proxies / tunnels
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const forwardedProto =
      request.headers.get("x-forwarded-proto") ||
      (url.protocol.replace(":", "") || "http");

    if (forwardedHost) {
      const normalizedHost = forwardedHost.split(",")[0].trim();
      if (
        origin === `${forwardedProto}://${normalizedHost}` ||
        origin === `http://${normalizedHost}` ||
        origin === `https://${normalizedHost}` ||
        originUrl.host === normalizedHost
      ) {
        return true;
      }
    }

    // 2. Allow Cloudflare Tunnels (*.trycloudflare.com)
    if (originUrl.hostname.endsWith(".trycloudflare.com")) {
      return true;
    }

    // 3. Allow local development hosts
    if (
      originUrl.hostname === "localhost" ||
      originUrl.hostname === "127.0.0.1" ||
      originUrl.hostname === "0.0.0.0"
    ) {
      return true;
    }

    // 4. Match against configured site URL environment variable if present
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
    if (siteUrl) {
      const parsedSite = new URL(siteUrl);
      if (originUrl.origin === parsedSite.origin) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}
