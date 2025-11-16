// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/", "/login", "/register",
  "/favicon.ico", "/robots.txt", "/sitemap.xml",
  // Endpoints públicos
  "/api/logout",
  "/api/debug/cookies",
];

const STATIC_PREFIXES = [
  "/_next/", "/static/", "/assets/", "/favicon.",
  "/images/", "/fonts/",
];

// Prefijo protegido => posibles cookies válidas para ese rol
const ROLE_MAP: { prefix: string; cookies: string[] }[] = [
  { prefix: "/admin",        cookies: ["admin_id", "auth_token", "oquedal_token", "sb-access-token", "sb:access_token"] },
  { prefix: "/api/admin",    cookies: ["admin_id", "auth_token", "oquedal_token", "sb-access-token", "sb:access_token"] },

  { prefix: "/cliente",      cookies: ["usuario_id", "session", "token", "sb-access-token", "sb:access_token"] },
  { prefix: "/api/cliente",  cookies: ["usuario_id", "session", "token", "sb-access-token", "sb:access_token"] },

  { prefix: "/repartidor",   cookies: ["repartidor_id", "session", "token", "sb-access-token", "sb:access_token"] },
  { prefix: "/api/repartidor", cookies: ["repartidor_id", "session", "token", "sb-access-token", "sb:access_token"] },
];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  for (const p of STATIC_PREFIXES) if (pathname.startsWith(p)) return true;
  return false;
}

function findRoleEntry(pathname: string) {
  return ROLE_MAP.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/")
  );
}

function wantsJson(req: NextRequest) {
  const h = req.headers.get("accept") || "";
  return h.includes("application/json");
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  // Dejar pasar preflight y públicos/estáticos
  if (method === "OPTIONS") return NextResponse.next();
  if (isPublicPath(pathname)) return NextResponse.next();

  // Ver qué rol protege esta ruta (si aplica)
  const roleEntry = findRoleEntry(pathname);
  if (!roleEntry) return NextResponse.next();

  // ¿Tiene alguna cookie válida para ese rol?
  const hasCookie = roleEntry.cookies.some((name) => Boolean(req.cookies.get(name)?.value));

  if (hasCookie) return NextResponse.next();

  // No autorizado:
  // - Si es API: devolver 401 JSON
  // - Si es página: redirigir a /login con ?next=
  const isApi = pathname.startsWith("/api/");
  if (isApi || wantsJson(req)) {
    return new NextResponse(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/cliente/:path*",
    "/api/cliente/:path*",
    "/repartidor/:path*",
    "/api/repartidor/:path*",
    // Nota: no incluimos rutas públicas ni estáticos en matcher
  ],
};
