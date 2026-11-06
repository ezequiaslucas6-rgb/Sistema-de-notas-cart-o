import Link from "next/link";
import { Bell, LogOut, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Bits";
import { NavLinks, type NavItem } from "@/components/NavLinks";
import { MobileNav } from "@/components/MobileNav";
import { logoutAction } from "@/app/actions/auth";
import { db } from "@/lib/db";
import { requireUser, toActor } from "@/lib/session";
import { ROLE_LABEL, canManageCatalogs, canManageIntegrations, canManageUsers, canSeeAudit, canExport } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser();
  const a = toActor(u);
  const unread = await db.notification.count({ where: { userId: u.id, readAt: null } });

  const items: (NavItem & { show: boolean })[] = [
    { href: "/painel", label: "Painel", icon: "dash", show: true },
    { href: "/notas", label: a.role === "USUARIO" ? "Minhas notas" : "Notas", icon: "list", show: true },
    { href: "/notas/nova", label: "Nova nota", icon: "plus", show: true },
    { href: "/relatorios", label: "Relatórios", icon: "chart", show: canExport(a) },
    { href: "/usuarios", label: "Usuários", icon: "users", show: canManageUsers(a) },
    { href: "/cadastros", label: "Cadastros", icon: "cfg", show: canManageCatalogs(a) },
    { href: "/auditoria", label: "Auditoria", icon: "audit", show: canSeeAudit(a) },
    { href: "/integracoes", label: "Integrações", icon: "plug", show: canManageIntegrations(a) },
  ];
  const nav: NavItem[] = items.filter((i) => i.show).map(({ show: _s, ...i }) => i);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[244px_1fr]">
      <aside className="sidebar sticky top-0 hidden h-screen flex-col p-4 lg:flex">
        <Logo tone="light" className="px-2 pb-6 pt-1" />
        <NavLinks items={nav} />
        <div className="mt-auto flex items-center gap-2 rounded-xl bg-white/12 px-3 py-3 text-xs text-white/85">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden /> Conexão e dados protegidos
        </div>
      </aside>

      <div className="relative min-w-0 pb-24 lg:pb-0">
        {/* barra superior transparente sobre a faixa da marca */}
        <div className="absolute inset-x-0 top-0 z-20 flex h-[66px] items-center justify-between px-4 text-white sm:px-9">
          <div className="flex items-center gap-2.5">
            <span className="lg:hidden"><Logo tone="light" /></span>
            <span className="hidden text-[13px] text-white/85 lg:inline">{u.sectorName ? `Setor: ${u.sectorName}` : "Todos os setores"}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link href="/notificacoes" className="relative rounded-xl p-2 hover:bg-white/15" aria-label={`Notificações${unread ? ` (${unread} novas)` : ""}`}>
              <Bell className="h-5 w-5" />
              {unread > 0 && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
            </Link>
            <Link href="/perfil" className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 hover:bg-white/15">
              <Avatar name={u.name} className="!bg-white/25 !text-white" />
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-[13px] font-semibold">{u.name.split(" ")[0]}</span>
                <span className="block text-[11px] text-white/75">{ROLE_LABEL[u.role]}</span>
              </span>
            </Link>
            <form action={logoutAction} className="hidden lg:block">
              <button className="rounded-xl p-2 hover:bg-white/15" aria-label="Sair"><LogOut className="h-5 w-5" /></button>
            </form>
          </div>
        </div>
        <main className="page">{children}</main>
      </div>

      <MobileNav items={nav} unread={unread} userName={u.name} roleLabel={ROLE_LABEL[u.role]} logout={logoutAction} />
    </div>
  );
}
