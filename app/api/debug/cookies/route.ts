// app/api/debug/cookies/route.ts
import { NextResponse } from "next/server";

/**
 * Endpoint de depuración: devuelve las cookies que el servidor recibe.
 * Visita: http://localhost:3000/api/debug/cookies
 */
export async function GET(req: Request) {
  try {
    const cookieHeader = (req.headers && req.headers.get("cookie")) || "";
    const pairs = cookieHeader.split(";").map(s => s.trim()).filter(Boolean);
    const cookies: Record<string, string> = {};
    for (const p of pairs) {
      const [k, ...rest] = p.split("=");
      cookies[k] = rest.join("=");
    }
    return NextResponse.json({ ok: true, cookies, raw: cookieHeader });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
