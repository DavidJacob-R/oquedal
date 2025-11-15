export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { GET as GET_IMPL } from "@/app/api/admin/pedidos/stats/route";

export async function GET(req: Request) {
  return GET_IMPL(req);
}
