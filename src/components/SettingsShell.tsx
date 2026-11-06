import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionUser, toActor } from "@/lib/session";
import { SETTINGS_ITEMS } from "./settingsItems";

/** Menu interno das configurações + conteúdo ao lado. */
export async function SettingsShell({ current, children }: { current: string; children: React.ReactNode }) {
  const u = await getSessionUser();
  const actor = u ? toActor(u) : null;
  const items = SETTINGS_ITEMS.filter((i) => i.inShell && actor && i.can(actor));
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[230px_1fr]">
      <nav aria-label="Configurações" className="card flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible">
        <Link href="/configuracoes" className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" aria-hidden /> Todas</Link>
        <hr className="my-1 hidden border-slate-100 lg:block" />
        {items.map((i) => (
          <Link
            key={i.key}
            href={i.href!}
            aria-current={i.key === current ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${i.key === current ? "bg-brand-50 font-semibold text-brand-600" : "font-medium text-slate-600 hover:bg-slate-50"}`}
          >
            <i.icon className="h-[17px] w-[17px]" aria-hidden /> {i.label}
          </Link>
        ))}
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
