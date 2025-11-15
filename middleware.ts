import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const admin = req.cookies.get("admin_id")?.value;
  const cliente = req.cookies.get("usuario_id")?.value;
  const repartidor = req.cookies.get("repartidor_id")?.value;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!admin) return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/cliente") || pathname.startsWith("/api/cliente")) {
    if (!cliente) return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/repartidor") || pathname.startsWith("/api/repartidor")) {
    if (!repartidor) return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/cliente/:path*",
    "/api/cliente/:path*",
    "/repartidor/:path*",
    "/api/repartidor/:path*",
  ],
};
