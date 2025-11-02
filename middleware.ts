import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Protege /admin/**. Si no hay admin_id -> redirige a /login
export function middleware(request: NextRequest) {
  const adminId = request.cookies.get("admin_id")?.value;
  if (!adminId && request.nextUrl.pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
