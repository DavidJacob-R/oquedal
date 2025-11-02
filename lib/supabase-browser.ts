"use client";
import { createClient } from "@supabase/supabase-js";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL (.env.local)");
if (!anon) throw new Error("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local)");

export const supabaseBrowser = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});
