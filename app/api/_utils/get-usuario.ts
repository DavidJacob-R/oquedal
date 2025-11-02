import { getSupabaseAdmin } from "./supabase-admin";

export async function getUsuarioIdFromRequest(req: Request): Promise<string> {
  const h = req.headers;
  const auth = h.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";

  // 1) Si viene Bearer token (Auth real), úsalo
  if (token) {
    const supa = getSupabaseAdmin();
    const { data } = await supa.auth.getUser(token);
    const uid = data?.user?.id;
    if (uid) return uid;
  }

  // 2) Fallback: header x-usuario-id
  const uidH = h.get("x-usuario-id");
  if (uidH?.trim()) return uidH.trim();

  // 3) Fallback: cookie usuario_id
  const cookie = h.get("cookie") || "";
  const m = /(?:^|;\s*)usuario_id=([^;]+)/i.exec(cookie);
  const fromCookie = m?.[1];
  if (fromCookie?.trim()) return decodeURIComponent(fromCookie.trim());

  throw new Error("sesión requerida");
}
