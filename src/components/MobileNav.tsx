"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, ClipboardList, LayoutDashboard, LogOut, Menu, Plus, X } from "lucide-react";
import { NavLinks, isActive, type NavItem } from "./NavLinks";
import { Logo } from "./Logo";

/** Barra inferior (celular) + gaveta com o menu completo. */
export function MobileNav({ items, unread, userName, roleLabel, logout }: { items: NavItem[]; unread: number; userName: string; roleLabel: string; logout: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const tab = (href: string, label: string, Icon: typeof Bell, badge = 0) => {
    const on = isActive(path, href);
    return (
      <Link href={href} aria-current={on ? "page" : undefined} className={`relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10.5px] font-medium ${on ? "text-brand-600" : "text-slate-500"}`}>
        <Icon className="h-5 w-5" aria-hidden />
        {label}
        {badge > 0 && <span className="absolute right-1.5 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">{badge > 9 ? "9+" : badge}</span>}
      </Link>
    );
  };
  return (
    <div className="lg:hidden">
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-slate-200 bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur" aria-label="Navegação">
        {tab("/painel", "Painel", LayoutDashboard)}
        {tab("/notas", "Notas", ClipboardList)}
        <Link href="/notas/nova" aria-label="Nova nota" className="-mt-6 flex flex-col items-center gap-0.5 text-[10.5px] font-medium text-slate-500">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white shadow-[0_6px_16px_-4px_rgba(0,105,233,0.6)]"><Plus className="h-6 w-6" aria-hidden /></span>
          Nova
        </Link>
        {tab("/notificacoes", "Avisos", Bell, unread)}
        <button type="button" onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 px-3 py-1 text-[10.5px] font-medium text-slate-500" aria-label="Abrir menu">
          <Menu className="h-5 w-5" aria-hidden /> Menu
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-slate-900/50" aria-label="Fechar menu" onClick={() => setOpen(false)} />
          <div className="sidebar absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl p-5 pb-8 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <Logo tone="light" />
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-white/80 hover:bg-white/10" aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>
            <NavLinks items={items} onNavigate={() => setOpen(false)} />
            <div className="mt-5 flex items-center justify-between rounded-xl bg-white/12 px-4 py-3 text-white">
              <div className="leading-tight"><div className="text-sm font-semibold">{userName}</div><div className="text-xs text-white/70">{roleLabel}</div></div>
              <form action={logout}><button className="flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium hover:bg-white/25"><LogOut className="h-4 w-4" /> Sair</button></form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
