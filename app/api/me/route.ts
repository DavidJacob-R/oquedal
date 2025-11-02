export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET() {
  const token = cookies().get("session")?.value;
  if (!token) return NextResponse.json({ ok: true, user: null });

  try {
    const data = jwt.verify(token, process.env.JWT_SECRET || "insecure_dev_secret") as any;
    return NextResponse.json({ ok: true, user: { id: data.id, nombre: data.nombre, email: data.email, rol: data.rol } });
  } catch {
    return NextResponse.json({ ok: true, user: null });
  }
}
