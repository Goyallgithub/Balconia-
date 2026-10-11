import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Serve the GPT static frontend at / while keeping /api on Next. */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/index.html", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
