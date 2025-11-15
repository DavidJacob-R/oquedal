"use client";

import { useState } from "react";

type Props = {
  onMenuClick: () => void;
  onCollapseClick: () => void;
  collapsed: boolean;
};

export default function AdminTopbar({ onMenuClick, onCollapseClick, collapsed }: Props) {
  const [openUser, setOpenUser] = useState(false);

  async function logout() {
    try { await fetch("/api/logout", { method: "POST" }); } catch {}
    window.location.href = "/login";
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-[var(--header-h)] border-b border-white/10 bg-neutral-900/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-900/60">
      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-3 px-3 md:px-4 lg:px-6">
        <button
          onClick={onMenuClick}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-neutral-800/70 hover:bg-neutral-800 transition"
          aria-label="menu"
        >
          <span className="i i-bars-3" />
        </button>

        <button
          onClick={onCollapseClick}
          className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-neutral-800/70 hover:bg-neutral-800 transition"
          aria-label="colapsar"
          title="Colapsar"
        >
          {collapsed ? <span className="i i-panel-right" /> : <span className="i i-panel-left" />}
        </button>

        <div className="ml-1 flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 ring-1 ring-white/20" />
          <div className="text-sm font-semibold tracking-wide">
            Oquedal <span className="text-orange-400">Admin</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:flex items-center">
            <input
              placeholder="Buscar..."
              className="h-9 w-56 rounded-xl border border-white/10 bg-neutral-800/60 px-3 text-sm outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-orange-500/50"
            />
          </div>

          <button
            onClick={() => setOpenUser(v => !v)}
            className="relative inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-neutral-800/70 px-2 hover:bg-neutral-800 transition"
          >
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-600 ring-1 ring-white/10" />
            <span className="hidden sm:inline text-sm">Cuenta</span>
            <span className="i i-chevron-down" />
            {openUser && (
              <div
                className="absolute right-0 top-11 w-48 rounded-xl border border-white/10 bg-neutral-900/95 p-1 shadow-2xl ring-1 ring-black/40"
                onMouseLeave={() => setOpenUser(false)}
              >
                <button onClick={logout} className="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-white/5">
                  Cerrar sesion
                </button>
              </div>
            )}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .i { display:inline-block; width:1.2rem; height:1.2rem; position:relative; }
        .i::before, .i::after { content:""; position:absolute; inset:0; margin:auto; }
        .i.i-bars-3::before { width:16px; height:2px; background:#fff; top:-6px; box-shadow:0 6px 0 #fff, 0 12px 0 #fff; opacity:.9; }
        .i.i-panel-left::before { width:14px; height:12px; border:2px solid #fff; border-right-width:5px; opacity:.9; }
        .i.i-panel-right::before { width:14px; height:12px; border:2px solid #fff; border-left-width:5px; opacity:.9; }
        .i.i-chevron-down::before { width:8px; height:8px; border-right:2px solid #fff; border-bottom:2px solid #fff; transform:rotate(45deg) translateY(-2px); opacity:.8; }
      `}</style>
    </header>
  );
}
