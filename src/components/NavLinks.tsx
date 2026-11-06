"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, FilePlus2, LayoutDashboard, Plug, ScrollText, Settings, Users, UserCircle, Bell } from "lucide-react";

const ICONS = { dash: LayoutDashboard, list: ClipboardList, plus: FilePlus2, chart: BarChart3, users: Users, cfg: Settings, audit: ScrollText, plug: Plug, user: UserCircle, bell: Bell };
export type NavIcon = keyof typeof ICONS;
export type NavItem = { href: string; label: string; icon: NavIcon };

export function isActive(path: string, href: string) {
  if (href === "/notas") return path === "/notas" || (path.startsWith("/notas/") && !path.startsWith("/notas/nova"));
  if (href === "/configuracoes") return path.startsWith("/configuracoes") || path.startsWith("/cadastros");
  return path === href || path.startsWith(href + "/");
}

export function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Menu principal">
      {items.map((i) => {
        const on = isActive(path, i.href);
        const Icon = ICONS[i.icon];
        return (
          <Link
            key={i.href}
            href={i.href}
            onClick={onNavigate}
            aria-current={on ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${on ? "bg-white text-brand-600 shadow-[0_6px_14px_-6px_rgba(0,20,70,0.5)] font-semibold" : "text-white/85 hover:bg-white/12 hover:text-white"}`}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden /> {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
