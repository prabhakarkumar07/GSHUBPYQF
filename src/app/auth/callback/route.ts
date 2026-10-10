// Clerk handles OAuth callbacks automatically via its own middleware.
// This route is kept as a simple redirect fallback for any old links.
import { NextResponse, type NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/dashboard";
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return NextResponse.redirect(new URL(safe, url.origin));
}
