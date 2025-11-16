// app/api/admin/empleados/create/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { tx } from "@/lib/db";

type Body = {
  tipo: "repartidor" | "ayudante";
  nombre: string;
  email: string;
  telefono?: string;
  pass?: string;        // según tu login; aquí se guarda en pass_hash (ajusta hashing si usas bcrypt)
  licencia?: string;    // requerido para repartidor
};

export async function POST(req: Request) {
  const isAdmin = Boolean(cookies().get("admin_id")?.value);
  if (!isAdmin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Body;
  if (!body || !body.tipo || !body.nombre || !body.email) {
    return NextResponse.json({ ok: false, error: "Datos incompletos" }, { status: 400 });
  }
  if (body.tipo === "repartidor" && !body.licencia) {
    return NextResponse.json({ ok: false, error: "Licencia requerida para repartidor" }, { status: 400 });
  }

  try {
    const result = await tx(async (client: any) => {
      // roles
      const roles = await client.query(
        `SELECT id, LOWER(nombre) AS nombre FROM public.rol WHERE LOWER(nombre) IN ('repartidor','ayudante')`
      );
      const roleMap: Record<string, string> = {};
      for (const r of roles.rows) roleMap[r.nombre] = r.id;

      const rolId = roleMap[body.tipo];
      if (!rolId) throw new Error(`Rol ${body.tipo} no existe`);

      // crear usuario
      const passHash = body.pass ?? "temporal123"; // ajusta hashing si ya lo usas
      const insU = await client.query(
        `INSERT INTO public.usuario (rol_id, nombre, email, telefono, pass_hash, activo)
         VALUES ($1,$2,$3,$4,$5,true)
         RETURNING id`,
        [rolId, body.nombre, body.email, body.telefono ?? null, passHash]
      );
      const usuarioId = insU.rows[0].id as string;

      // si es repartidor => crear registro en conductor con licencia
      if (body.tipo === "repartidor") {
        await client.query(
          `INSERT INTO public.conductor (usuario_id, licencia, activo)
           VALUES ($1, $2, true)`,
          [usuarioId, body.licencia]
        );
      }

      return { ok: true, id: usuarioId };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 400 });
  }
}
