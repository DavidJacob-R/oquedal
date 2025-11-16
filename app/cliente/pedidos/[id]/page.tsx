"use client";

import React, { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Pedido = any; // si quieres puedes tiparlo mejor luego

type PedidoDetallePageProps = {
  params?: {
    id?: string;
  };
};

async function buildAuthHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();

  const headers: Record<string, string> = {};

  const uid =
    session?.user?.id || localStorage.getItem("usuario_id") || "";

  if (uid) {
    headers["x-usuario-id"] = uid;
  }

  if (session?.access_token) {
    headers["authorization"] = `Bearer ${session.access_token}`;
  }

  return headers;
}

export default function PedidoDetallePage({ params }: PedidoDetallePageProps) {
  const id = params?.id ?? "";
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const cargarPedido = async () => {
      try {
        setCargando(true);
        setError(null);

        const headers = await buildAuthHeaders();

        const resp = await fetch(`/api/cliente/pedidos/${id}`, {
          headers,
        });

        if (!resp.ok) {
          throw new Error("Error al obtener el pedido");
        }

        const data = await resp.json();
        setPedido(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message ?? "Error desconocido");
      } finally {
        setCargando(false);
      }
    };

    cargarPedido();
  }, [id]);

  if (!id) {
    return <div className="p-4">Pedido no encontrado.</div>;
  }

  if (cargando) {
    return <div className="p-4">Cargando pedido...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Ocurrio un error: {error}
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="p-4">
        No se encontro informacion del pedido.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <h1 className="text-xl font-bold mb-4">
        Detalle del pedido #{pedido.id ?? id}
      </h1>

      {/* Ajusta estos campos a lo que devuelva tu API */}
      <p>
        <span className="font-semibold">Estado:</span>{" "}
        {pedido.estado ?? "Sin estado"}
      </p>
      <p>
        <span className="font-semibold">Origen:</span>{" "}
        {pedido.origen ?? "-"}
      </p>
      <p>
        <span className="font-semibold">Destino:</span>{" "}
        {pedido.destino ?? "-"}
      </p>
      <p>
        <span className="font-semibold">Fecha:</span>{" "}
        {pedido.fecha ?? "-"}
      </p>
    </div>
  );
}
