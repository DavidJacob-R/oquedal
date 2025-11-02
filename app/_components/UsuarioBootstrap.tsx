"use client";
import { useEffect } from "react";

function gen() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "u_" + Math.random().toString(36).slice(2).padEnd(32, "0");
}

export default function UsuarioBootstrap() {
  useEffect(() => {
    let id = localStorage.getItem("usuario_id");
    if (!id) {
      id = gen();
      localStorage.setItem("usuario_id", id);
    }
    document.cookie = `usuario_id=${id}; path=/; max-age=31536000; samesite=lax`;
  }, []);
  return null;
}
