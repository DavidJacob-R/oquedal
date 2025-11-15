// app/api/logout/route.ts
import { NextResponse } from "next/server";

/**
 * Lista de nombres de cookie que queremos limpiar al hacer logout.
 * Añade aquí todos los nombres que tu app crea en login (ej: admin_id, auth_token, oquedal_token...)
 */
const COOKIES_TO_CLEAR = [
  "admin_id",
  "usuario_id",
  "repartidor_id",
  "auth_token",
  "token",
  "session",
  "sessionid",
  "oquedal_session",
  "oquedal_token",
  "sb-access-token",
  "sb-refresh-token",
  "supabase-auth-token",
];

/**
 * Si tus cookies fueron creadas con un dominio específico (por ejemplo ".midominio.com"),
 * descomenta y ajusta DOMAIN_TO_CLEAR. Si no, déjalo en undefined.
 */
// const DOMAIN_TO_CLEAR = ".midominio.com";
const DOMAIN_TO_CLEAR = undefined;

/**
 * Crea una respuesta redirect y agrega Set-Cookie para borrar cookies.
 */
function makeClearResponse(redirectTo = "/login") {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_URL ||
    "http://localhost:3000";

  const res = NextResponse.redirect(new URL(redirectTo, base));

  for (const name of COOKIES_TO_CLEAR) {
    // Intento 1: cookie HttpOnly (server-side)
    res.cookies.set({
      name,
      value: "",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      expires: new Date(0),
      maxAge: 0,
      domain: DOMAIN_TO_CLEAR ?? undefined,
    });
    // Intento 2: cookie no-HttpOnly (por si fue creada desde cliente)
    res.cookies.set({
      name,
      value: "",
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      expires: new Date(0),
      maxAge: 0,
      domain: DOMAIN_TO_CLEAR ?? undefined,
    });
  }

  // Forzar que el navegador no use caché de páginas protegidas
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");

  return res;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const next = url.searchParams.get("next") || "/login";
    // Si guardas sesiones en BD, invalida la sesión aquí (ej: await invalidateSession(...))
    return makeClearResponse(next);
  } catch (e) {
    return makeClearResponse("/login");
  }
}

export async function POST(req: Request) {
  return GET(req);
}
