import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok:true });
  res.cookies.set("usuario_id", "", { path:"/", maxAge: 0 });
  res.cookies.set("rol", "", { path:"/", maxAge: 0 });
  return res;
}
