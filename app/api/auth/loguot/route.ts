// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NAMES = [
  "repartidor_id",
  "admin_id",
  "usuario_id",
  "auth_token",
  "oquedal_token",
  "session",
  "token",
];

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });

  // Dominio actual (para borrar también cookies con Domain=...)
  const url = new URL(req.url);
  const host = url.hostname.replace(/^www\./, "");
  const domains = [undefined, host, `.${host}`] as const;

  for (const name of NAMES) {
    // 1) Sin Domain, no-HttpOnly
    res.cookies.set({
      name,
      value: "",
      path: "/",
      expires: new Date(0),
      httpOnly: false,
      sameSite: "lax",
    });
    // 2) Sin Domain, HttpOnly
    res.cookies.set({
      name,
      value: "",
      path: "/",
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
    });
    // 3) Con Domain explícito (host)
    for (const d of domains) {
      if (!d) continue;
      res.cookies.set({
        name,
        value: "",
        path: "/",
        domain: d,
        expires: new Date(0),
        httpOnly: false,
        sameSite: "lax",
      });
      res.cookies.set({
        name,
        value: "",
        path: "/",
        domain: d,
        expires: new Date(0),
        httpOnly: true,
        sameSite: "lax",
      });
    }
  }

  return res;
}
