// app/logout/route.ts
import { NextResponse } from "next/server";
import { cookieOpts } from "@/lib/auth";

function clearAllAuthCookies(res: NextResponse) {
  const base = cookieOpts();
  const opts = { ...base, maxAge: 0, expires: new Date(0) };
  for (const name of ["admin_id", "usuario_id", "repartidor_id", "auth_token", "oquedal_token"]) {
    res.cookies.set(name, "", opts);
  }
}

export async function GET(req: Request) {
  // Redirige al login después de limpiar cookies
  const url = new URL("/login", req.url);
  const res = NextResponse.redirect(url);
  clearAllAuthCookies(res);
  return res;
}
