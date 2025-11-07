import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const rol = req.cookies.get("rol")?.value || "";

  // Protege modulo del repartidor
  if (pathname.startsWith("/repartidor") || pathname.startsWith("/api/repartidor")) {
    if (rol !== "repartidor") {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Un repartidor no puede navegar admin/cliente
  if (rol === "repartidor") {
    if (pathname.startsWith("/admin") || pathname.startsWith("/cliente")) {
      return NextResponse.redirect(new URL("/repartidor", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/repartidor/:path*",
    "/api/repartidor/:path*",
    "/admin/:path*",
    "/cliente/:path*",
  ],
};
