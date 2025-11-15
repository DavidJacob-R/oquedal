import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_id", "", { path: "/", maxAge: 0, sameSite: "lax" });
  res.cookies.set("usuario_id", "", { path: "/", maxAge: 0, sameSite: "lax" });
  res.cookies.set("repartidor_id", "", { path: "/", maxAge: 0, sameSite: "lax" });
  res.cookies.set("rol", "", { path: "/", maxAge: 0, sameSite: "lax" }); // por si existia
  return res;
}
