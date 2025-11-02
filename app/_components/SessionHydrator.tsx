"use client";
import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function SessionHydrator() {
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      localStorage.setItem("usuario_id", uid);
      document.cookie = `usuario_id=${uid}; path=/; max-age=31536000; samesite=lax`;
      // llamada idempotente para asegurar cliente
      if (session?.access_token) {
        try { await fetch("/api/auth/ensure-cliente", {
          method: "POST",
          headers: { authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
          body: JSON.stringify({})
        }); } catch {}
      }
    })();
  }, []);
  return null;
}
