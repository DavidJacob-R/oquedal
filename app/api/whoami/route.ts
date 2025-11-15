import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const raw = req.headers.get("cookie") || "";
  const get = (n: string) => {
    const m = new RegExp(`(?:^|;\\s*)${n}=([^;]+)`).exec(raw);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  };
  return NextResponse.json({
    admin_id: get("admin_id"),
    usuario_id: get("usuario_id"),
    repartidor_id: get("repartidor_id"),
  });
}
