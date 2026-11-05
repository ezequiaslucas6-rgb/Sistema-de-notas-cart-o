import Link from "next/link";
import { Bell, ClipboardList, FilePlus2, LayoutDashboard, LogOut, Menu, Plug, ScrollText, Settings2, ShieldCheck, UserCircle, Users, BarChart3 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { logoutAction } from "@/app/actions/auth";
import { db } from "@/lib/db";
import { requireUser, toActor } from "@/lib/session";
import { ROLE_LABEL, canManageCatalogs, canManageIntegrations, canManageUsers, canSeeAudit, canExport } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const a = toActor(u);
  const unread = await db.notification.count({ where: { userId: u.id, readAt: null } });

  const items = [
    { href: "/painel", label: "Painel", icon: LayoutDashboard, show: true },
    { href: "/notas", label: a.role === "USUARIO" ? "Minhas notas" : "Notas", icon: ClipboardList, show: true },
    { href: "/notas/nova", label: "Nova nota", icon: FilePlus2, show: true },
    { href: "/relatorios", label: "Relatórios", icon: BarChart3, show: canExport(a) },
    { href: "/usuarios", label: "Usuários", icon: Users, show: canManageUsers(a) },
    { href: "/cadastros", label: "Cadastros", icon: Settings2, show: canManageCatalogs(a) },
    { href: "/auditoria", label: "Auditoria", icon: ScrollText, show: canSeeAudit(a) },
    { href: "/integracoes", label: "Integrações", icon: Plug, show: canManageIntegrations(a) },
  ].filter((i) => i.show);

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700">
          <i.icon className="h-4 w-4" aria-hidden /> {i.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white p-4 lg:block">
        <Logo className="mb-6 px-1" />
        {nav}
        <div className="mt-8 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden /> Conexão e dados protegidos
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <details className="relative lg:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium" aria-label="Abrir menu">
              <Menu className="h-4 w-4" /> Menu
            </summary>
            <div className="absolute left-0 top-12 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">{nav}</div>
          </details>
          <div className="hidden text-sm text-slate-500 lg:block">
            {u.sectorName ? `Setor: ${u.sectorName}` : "Todos os setores"}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/notificacoes" className="relative rounded-lg p-2 hover:bg-slate-100" aria-label={`Notificações${unread ? ` (${unread} novas)` : ""}`}>
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
            </Link>
            <Link href="/perfil" className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100">
              <UserCircle className="h-6 w-6 text-slate-500" aria-hidden />
              <span className="hidden text-left text-sm leading-tight sm:block">
                <span className="block font-semibold">{u.name.split(" ")[0]}</span>
                <span className="block text-xs text-slate-500">{ROLE_LABEL[u.role]}</span>
              </span>
            </Link>
            <form action={logoutAction}>
              <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Sair"><LogOut className="h-5 w-5" /></button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
