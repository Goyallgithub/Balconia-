import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PAGE_REWRITES: Record<string, string> = {
  "/": "/index.html",
  "/catalogue": "/catalogue.html",
  "/shop": "/catalogue.html",
  "/cart": "/cart.html",
  "/checkout": "/checkout.html",
  "/diwali": "/diwali.html",
  "/privacy": "/privacy.html",
  "/terms": "/terms.html",
  "/returns": "/returns.html",
  "/reviews": "/reviews.html",
};

/** Serve the static frontend pages while preserving /api on Next. */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const target = PAGE_REWRITES[pathname];
  if (target) {
    return NextResponse.rewrite(new URL(`${target}${search}`, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/catalogue",
    "/shop",
    "/cart",
    "/checkout",
    "/diwali",
    "/privacy",
    "/terms",
    "/returns",
    "/reviews",
  ],
};

