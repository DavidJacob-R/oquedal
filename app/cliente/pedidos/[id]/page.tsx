import { supabaseBrowser } from "@/lib/supabase-browser";
async function buildAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  const headers: Record<string, string> = {};
  const uid = session?.user?.id || localStorage.getItem("usuario_id") || "";
  if (uid) headers["x-usuario-id"] = uid;
  if (session?.access_token) headers["authorization"] = `Bearer ${session.access_token}`;
  return headers;
}
