import type { ReactNode } from "react";
import RepartidorTopbar from "@/components/repartidor/Topbar";

export default function RepartidorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0a0a0f] text-zinc-100">
      <RepartidorTopbar />
      <main className="max-w-6xl mx-auto px-4 py-4">{children}</main>
    </div>
  );
}
