import { CreditCard } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { canManageRules } from "@/lib/permissions";
import { monthRange } from "@/lib/expenses";
import { formatBRL } from "@/lib/validators";
import { toggleCardAction } from "@/app/actions/settings";
import { EmptyState, PageTitle } from "@/components/Bits";
import { SettingsShell } from "@/components/SettingsShell";
import { PaneHeader } from "@/components/SettingsUI";
import { CardForm } from "@/components/SettingsForms";

export const metadata = { title: "Cartões corporativos" };
export const dynamic = "force-dynamic";

export default async function CardsPage() {
  await requireRole(canManageRules);
  const { start, end } = monthRange();
  const [cards, holders, usage] = await Promise.all([
    db.card.findMany({ include: { holder: { select: { name: true } } }, orderBy: [{ active: "desc" }, { label: "asc" }] }),
    db.user.findMany({ where: { active: true, anonymizedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.expense.groupBy({ by: ["cardId"], where: { deletedAt: null, cardId: { not: null }, date: { gte: start, lte: end } }, _sum: { amountCents: true }, _count: true }),
  ]);
  const used = new Map(usage.map((u) => [u.cardId, u]));

  return (
    <>
      <PageTitle title="Cartões corporativos" subtitle="Cadastre os cartões e acompanhe o uso de cada um no mês" />
      <SettingsShell current="cartoes">
        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <h2 className="mb-3 font-semibold text-slate-900">Adicionar cartão</h2>
            <CardForm holders={holders} />
            <p className="mt-3 text-xs text-slate-500">Colaboradores que têm cartão cadastrado escolhem o cartão ao lançar a nota. Quem não tem continua informando só os 4 últimos dígitos.</p>
          </section>

          <section className="card overflow-hidden">
            <PaneHeader title="Cartões cadastrados" />
            {cards.length === 0 ? (
              <EmptyState icon={CreditCard} title="Nenhum cartão cadastrado" text="Adicione o primeiro cartão acima." />
            ) : (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {cards.map((c) => {
                  const u = used.get(c.id);
                  const total = u?._sum.amountCents ?? 0;
                  const pct = c.limitCents ? Math.min(100, Math.round((total / c.limitCents) * 100)) : 0;
                  const over = !!c.limitCents && total > c.limitCents;
                  return (
                    <li key={c.id} className={`px-5 py-4 sm:px-6 ${c.active ? "" : "opacity-60"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3.5">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600"><CreditCard className="h-[18px] w-[18px]" aria-hidden /></span>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900">{c.label} <span className="font-normal text-slate-400">· final {c.last4}</span></div>
                            <div className="text-xs text-slate-500">{c.holder?.name ?? "Compartilhado"} · {u?._count ?? 0} nota(s) no mês · {formatBRL(total)}{c.limitCents ? ` de ${formatBRL(c.limitCents)}` : ""}</div>
                          </div>
                        </div>
                        <form action={toggleCardAction}>
                          <input type="hidden" name="id" value={c.id} /><input type="hidden" name="active" value={c.active ? "0" : "1"} />
                          <button className="text-sm font-medium text-brand-600 hover:underline">{c.active ? "Desativar" : "Reativar"}</button>
                        </form>
                      </div>
                      {c.limitCents ? (
                        <div className="mt-3" role="img" aria-label={`${pct}% do limite usado`}>
                          <div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${over ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-gradient-to-r from-brand-600 to-cyan-500"}`} style={{ width: `${Math.max(3, pct)}%` }} /></div>
                          {over && <p className="mt-1 text-xs font-medium text-red-600">Limite mensal ultrapassado.</p>}
                        </div>
                      ) : null}
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700">Editar</summary>
                        <div className="mt-3"><CardForm holders={holders} initial={{ id: c.id, label: c.label, last4: c.last4, holderId: c.holderId, limitCents: c.limitCents }} submitLabel="Salvar" /></div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </SettingsShell>
    </>
  );
}
