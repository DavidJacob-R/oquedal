// genera un ID deterministico a partir del email (mismo email -> mismo ID)
export async function idFromEmail(email: string): Promise<string> {
  const norm = (email || "").trim().toLowerCase();
  if (!norm) throw new Error("email requerido");
  // usa SHA-256 si está disponible (navegador moderno)
  if (typeof crypto !== "undefined" && (crypto as any).subtle?.digest) {
    const enc = new TextEncoder().encode(norm);
    const buf = await (crypto as any).subtle.digest("SHA-256", enc);
    const arr = Array.from(new Uint8Array(buf)).slice(0, 16); // 16 bytes = 32 hex
    const hex = arr.map((b) => b.toString(16).padStart(2, "0")).join("");
    return "u_" + hex; // ej: u_0a1b2c...
  }
  // fallback: base64 del email normalizado (acorta)
  // @ts-ignore
  const b64 = (typeof btoa !== "undefined" ? btoa(norm) : Buffer.from(norm).toString("base64"))
    .replace(/=+/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return "u_" + b64.slice(0, 22);
}
