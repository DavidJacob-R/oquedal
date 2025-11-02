export function getAdminId(headers: Headers) {
  const h = headers.get("x-admin-id");
  if (h && h.trim()) return h.trim();
  const cookie = headers.get("cookie") || "";
  const m = /(?:^|;\s*)admin_id=([^;]+)/i.exec(cookie);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}
