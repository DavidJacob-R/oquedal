// lib/auth.ts
export async function verifyPassword(plain: string, hash: string | null | undefined) {
  if (!hash) return false;
  // Si tiene pinta de bcrypt, intentamos usar bcryptjs
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
    try {
      const bcrypt = await import("bcryptjs");
      return await bcrypt.compare(plain, hash);
    } catch {
      // si no existe bcryptjs, cae a comparación simple (solo útil en dev)
      return plain === hash;
    }
  }
  return plain === hash;
}

export function cookieOpts() {
  const prod = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: prod,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  };
}
