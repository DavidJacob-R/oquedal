// app/api/admin/clientes/[id]/route.ts
import { NextResponse } from "next/server";
import { tx } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const body = await req.json();
  const { nombre, email, telefono } = body || {};

  if (!nombre && !email && !telefono) {
    return NextResponse.json({ ok: false, error: "Nada que actualizar" }, { status: 400 });
  }

  try {
    await tx(async (client: any) => {
      if (email) {
        await client.query(
          `UPDATE public.cliente SET email=$1 WHERE id=$2`,
          [email, id]
        );
      }
      if (telefono) {
        await client.query(
          `UPDATE public.cliente SET telefono=$1 WHERE id=$2`,
          [telefono, id]
        );
      }
      if (nombre) {
        await client.query(
          `UPDATE public.cliente SET nombre=$1 WHERE id=$2`,
          [nombre, id]
        );
      }
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const id = params.id;

  try {
    // Intentar borrado duro; si hay FK lo bloquea y devolvemos 409
    await tx(async (client: any) => {
      await client.query(`DELETE FROM public.cliente WHERE id=$1`, [id]);
    });
    return NextResponse.json({ ok: true, deleted: id });
  } catch (e: any) {
    // Cuando hay pedidos/direcciones referenciando el cliente saltará error de FK
    return NextResponse.json(
      { ok: false, error: "No se puede eliminar: cliente con referencias (pedidos, direcciones, etc.). Desactívelo o limpie dependencias.", code: "FK_CONSTRAINT" },
      { status: 409 }
    );
  }
}
