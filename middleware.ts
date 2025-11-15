// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
];

const STATIC_PREFIXES = ["/_next/", "/static/", "/assets/", "/favicon."];

/**
 * ROLE_MAP: prefijo de ruta => posibles nombres de cookie que validan la sesión.
 * Ajusta los nombres según las cookies que realmente usa tu app.
 */
const ROLE_MAP: { prefix: string; cookies: string[] }[] = [
  { prefix: "/admin", cookies: ["admin_id", "auth_token", "oquedal_token"] },
  { prefix: "/api/admin", cookies: ["admin_id", "auth_token", "oquedal_token"] },

  { prefix: "/cliente", cookies: ["usuario_id", "session", "token"] },
  { prefix: "/api/cliente", cookies: ["usuario_id", "session", "token"] },

  { prefix: "/repartidor", cookies: ["repartidor_id", "session", "token"] },
  { prefix: "/api/repartidor", cookies: ["repartidor_id", "session", "token"] },
];

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  for (const p of STATIC_PREFIXES) if (pathname.startsWith(p)) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permitir recursos estáticos y rutas públicas
  if (isPublic(pathname)) return NextResponse.next();

  // Buscar cuál rol protege la ruta actual
  const roleEntry = ROLE_MAP.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));

  // Si la ruta no está mapeada como protegida, dejar pasar
  if (!roleEntry) return NextResponse.next();

  // Verificar si existe alguna de las cookies válidas para ese rol
  const hasCookie = roleEntry.cookies.some((name) => Boolean(req.cookies.get(name)?.value));

  if (hasCookie) {
    return NextResponse.next();
  }

  // Si no tiene cookie, redirigir a /login y conservar la ruta original en `next`
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
  ],
};
