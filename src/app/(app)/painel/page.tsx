import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser, toActor } from "@/lib/session";
import { canSeeAll, expenseScope } from "@/lib/permissions";
import { brDate, monthRange } from "@/lib/expenses";
import { formatBRL } from "@/lib/validators";
import { Clock, FilePlus2, Receipt, TrendingUp, Wallet } from "lucide-react";
import { Avatar, BarList, EmptyState, Kpi, PageTitle, StatusBadge } from "@/components/Bits";

export const metadata = { title: "Painel" };
export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const u = await requireUser();
  const a = toActor(u);
  const sp = await searchParams;
  const { start, end } = monthRange();
  const prevStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1));
  const scope = expenseScope(a);
  const month = { AND: [scope, { date: { gte: start, lte: end } }] };

  const [agg, prevAgg, pending, recent, byCat, bySector, byUser] = await Promise.all([
    db.expense.aggregate({ where: month, _sum: { amountCents: true }, _count: true }),
    db.expense.aggregate({ where: { AND: [scope, { date: { gte: prevStart, lt: start } }] }, _sum: { amountCents: true } }),
    db.expense.count({ where: { AND: [scope, { status: "LANCADA" }] } }),
    db.expense.findMany({ where: scope, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 6, include: { user: { select: { name: true } }, category: { select: { name: true } } } }),
    db.expense.groupBy({ by: ["categoryId"], where: month, _sum: { amountCents: true }, orderBy: { _sum: { amountCents: "desc" } }, take: 6 }),
    canSeeAll(a) ? db.expense.groupBy({ by: ["sectorId"], where: month, _sum: { amountCents: true }, orderBy: { _sum: { amountCents: "desc" } }, take: 6 }) : Promise.resolve([]),
    canSeeAll(a) || a.role === "GESTOR" ? db.expense.groupBy({ by: ["userId"], where: month, _sum: { amountCents: true }, orderBy: { _sum: { amountCents: "desc" } }, take: 6 }) : Promise.resolve([]),
  ]);

  const [cats, sectors, users] = await Promise.all([
    db.category.findMany({ where: { id: { in: byCat.map((c) => c.categoryId) } } }),
    db.sector.findMany({ where: { id: { in: bySector.map((s) => s.sectorId).filter(Boolean) as string[] } } }),
    db.user.findMany({ where: { id: { in: byUser.map((x) => x.userId) } }, select: { id: true, name: true } }),
  ]);

  const total = agg._sum.amountCents ?? 0;
  const prev = prevAgg._sum.amountCents ?? 0;
  const delta = prev ? Math.round(((total - prev) / prev) * 100) : null;
  const monthName = start.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  const own = a.role === "USUARIO";
  const monthOnly = start.toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" });

  const first = u.name.split(" ")[0];
  return (
    <>
      <PageTitle
        title={`Olá, ${first}`}
        subtitle={`Resumo do uso do cartão corporativo em ${monthName}`}
        notice={sp.erro === "permissao" ? { text: "Você não tem permissão para acessar essa área.", kind: "error" } : undefined}
      >
        <Link href="/notas/nova" className="btn-primary">+ Lançar nota</Link>
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-4">
        <Kpi icon={Wallet} tone="blue" label={own ? `Você usou em ${monthOnly}` : `Total em ${monthOnly}`} value={formatBRL(total)} hint={delta === null ? undefined : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}% vs. mês anterior`} />
        <Kpi icon={Receipt} tone="cyan" label="Notas no mês" value={String(agg._count)} />
        <Kpi icon={TrendingUp} tone="green" label="Ticket médio" value={formatBRL(agg._count ? Math.round(total / agg._count) : 0)} />
        <Kpi icon={Clock} tone="amber" label={own ? "Aguardando revisão" : "Pendentes de revisão"} value={String(pending)} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-semibold text-slate-900">Por categoria</h2>
          <BarList format={formatBRL} rows={byCat.map((c) => ({ label: cats.find((x) => x.id === c.categoryId)?.name ?? "—", value: c._sum.amountCents ?? 0 }))} />
        </section>
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <h2 className="font-semibold text-slate-900">{own ? "Suas últimas notas" : "Últimas notas"}</h2>
            <Link href="/notas" className="text-sm font-medium text-brand-600 hover:underline">Ver todas</Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon={FilePlus2} title="Nenhuma nota ainda" text="Quando você lançar a primeira nota do cartão, ela aparece aqui." action={<Link href="/notas/nova" className="btn-primary">Lançar nota</Link>} />
          ) : (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {recent.map((e) => (
                <li key={e.id}>
                  <Link href={`/notas/${e.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <Avatar name={e.user.name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{e.supplier}</div>
                      <div className="truncate text-xs text-slate-500">{brDate(e.date)} · {e.category.name}{own ? "" : ` · ${e.user.name}`}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <StatusBadge status={e.status} />
                      <span className="font-bold tabular-nums">{formatBRL(e.amountCents)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        {!own && (
          <section className="card p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Maiores usuários do cartão</h2>
            <BarList format={formatBRL} rows={byUser.map((x) => ({ label: users.find((y) => y.id === x.userId)?.name ?? "—", value: x._sum.amountCents ?? 0 }))} />
          </section>
        )}
        {canSeeAll(a) ? (
          <section className="card p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Por setor</h2>
            <BarList format={formatBRL} rows={bySector.map((s) => ({ label: sectors.find((x) => x.id === s.sectorId)?.name ?? "Sem setor", value: s._sum.amountCents ?? 0 }))} />
          </section>
        ) : null}
      </div>
    </>
  );
}
