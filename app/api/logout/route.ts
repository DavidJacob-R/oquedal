// app/api/logout/route.ts
import { NextResponse } from "next/server";

/**
 * Lista de cookies a limpiar. Añade más nombres si tu app crea otros.
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
  "sb:access_token",
  "sb:refresh_token",
  "supabase-auth-token",
];

function clearResponse(redirectTo = "/login", reqUrl?: string) {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_URL ||
    (reqUrl ? new URL(reqUrl).origin : "http://localhost:3000");

  const res = NextResponse.redirect(new URL(redirectTo, base));

  // Determine host/domain variants to attempt clearing cookies for
  let host = "";
  try {
    host = reqUrl ? new URL(reqUrl).hostname : "";
  } catch {}

  const domainsToTry: (string | undefined)[] = [undefined];
  if (host) {
    domainsToTry.push(host);
    // add dot-prefixed domain (common when cookie uses .domain.com)
    if (!host.startsWith(".")) domainsToTry.push("." + host);
  }

  for (const name of COOKIES_TO_CLEAR) {
    for (const domain of domainsToTry) {
      // Two attempts: httpOnly (server-set) and non-httpOnly (client-set)
      res.cookies.set({
        name,
        value: "",
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        expires: new Date(0),
        maxAge: 0,
        domain: domain ?? undefined,
      });
      res.cookies.set({
        name,
        value: "",
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        expires: new Date(0),
        maxAge: 0,
        domain: domain ?? undefined,
      });
    }
  }

  // Prevent caching of pages that could show stale auth state
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");

  return res;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const next = url.searchParams.get("next") || "/login";
    return clearResponse(next, req.url);
  } catch (e) {
    return clearResponse("/login", undefined);
  }
}

export async function POST(req: Request) {
  return GET(req);
}
