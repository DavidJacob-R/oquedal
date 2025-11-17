import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE || "").trim();
  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE");
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
    return res.status(200).end();
  }
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, route: "/api/auth/ensure-cliente" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST", "OPTIONS"]);
    return res.status(405).json({ error: "method not allowed" });
  }

  try {
    const auth = req.headers.authorization || "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "falta token" });

    const supabase = getAdmin();

    // 1) Valida el token contra el MISMO proyecto (si las llaves están bien, funciona)
    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userRes?.user) return res.status(401).json({ error: "token inválido" });

    const user = userRes.user;
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const nombre = (body?.nombre || "").toString().trim() || null;
    const telefono = (body?.telefono || "").toString().trim() || null;
    const email = (user.email || "").toLowerCase() || null;

    // 2) lee si ya hay cliente por usuario_id
    const { data: existente, error: qErr } = await supabase
      .from("cliente")
      .select("id, nombre, telefono, email")
      .eq("usuario_id", user.id)
      .maybeSingle();
    if (qErr) return res.status(500).json({ error: qErr.message });

    const finalPayload: Record<string, any> = {
      usuario_id: user.id,                     // uuid real del MISMO proyecto
      ...(existente ? {} : { uid_local: null }),
      nombre: nombre ?? existente?.nombre ?? null,
      telefono: telefono ?? existente?.telefono ?? null,
      email: email ?? existente?.email ?? null,
      activo: true,
    };

    // 3) intenta upsert con FK fuerte
    let up = await supabase.from("cliente").upsert(finalPayload, { onConflict: "usuario_id" });
    if (up.error && /foreign key|23503/i.test(up.error.message)) {
      // ⚠️ fallback blando: si todavía hay mismatch, guarda sin FK para que no se caiga
      const fallback = {
        ...finalPayload,
        uid_local: user.id,     // guardamos el uuid como texto
        usuario_id: null,       // evitamos violar la FK
      };
      up = await supabase.from("cliente").upsert(fallback, { onConflict: "uid_local" });
    }

    if (up.error) return res.status(500).json({ error: up.error.message });
    return res.status(200).json({ ok: true, user_id: user.id });
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || "error" });
  }
}
