import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser, toActor } from "@/lib/session";
import { canReviewExpense } from "@/lib/permissions";
import { getRules } from "@/lib/settings";
import { brDate, buildWhere, expenseInclude, readFilters, monthRange, type SP } from "@/lib/expenses";
import { formatBRL } from "@/lib/validators";
import { FilterBar, filtersToQuery } from "@/components/FilterBar";
import { ClipboardList, Receipt, Wallet } from "lucide-react";
import { Avatar, EmptyState, Kpi, PageTitle, Pagination, StatusBadge } from "@/components/Bits";
import { reviewManyAction } from "@/app/actions/expenses";

export const metadata = { title: "Notas" };
export const dynamic = "force-dynamic";
const PAGE = 25;

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const u = await requireUser();
  const a = toActor(u);
  const sp = await searchParams;
  const f = readFilters(sp);
  const page = Math.max(1, Number(Array.isArray(sp.pagina) ? sp.pagina[0] : sp.pagina) || 1);
  const where = buildWhere(a, f);
  const { start, end } = monthRange();

  const [rows, count, sum, monthSum] = await Promise.all([
    db.expense.findMany({ where, include: expenseInclude, orderBy: [{ date: "desc" }, { createdAt: "desc" }], skip: (page - 1) * PAGE, take: PAGE }),
    db.expense.count({ where }),
    db.expense.aggregate({ where, _sum: { amountCents: true } }),
    a.role === "USUARIO" ? db.expense.aggregate({ where: buildWhere(a, { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }), _sum: { amountCents: true } }) : Promise.resolve(null),
  ]);
  const rules = await getRules();
  const reviewable = (e: { userId: string; sectorId: string | null }) => canReviewExpense(a, e, rules.managerCanReview);
  const review = rows.some((r) => r.status === "LANCADA" && reviewable(r));
  const high = (e: { amountCents: number; status: string }) => rules.highlightAboveCents !== null && e.amountCents >= rules.highlightAboveCents && e.status === "LANCADA";
  const HighBadge = () => <span className="badge bg-rose-50 text-rose-700">Valor alto</span>;
  const base = `/notas${filtersToQuery(f) ? "?" + filtersToQuery(f) : ""}`;

  return (
    <>
      <PageTitle title={a.role === "USUARIO" ? "Minhas notas" : "Notas lançadas"} subtitle={`${count} nota${count === 1 ? "" : "s"} · total ${formatBRL(sum._sum.amountCents ?? 0)}`}>
        <Link href="/notas/nova" className="btn-primary">+ Lançar nota</Link>
      </PageTitle>
      {monthSum && (
        <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
          <Kpi icon={Wallet} tone="blue" label="Total usado neste mês" value={formatBRL(monthSum._sum.amountCents ?? 0)} />
          <Kpi icon={Receipt} tone="cyan" label="Total do filtro atual" value={formatBRL(sum._sum.amountCents ?? 0)} hint={`${count} nota(s)`} />
        </div>
      )}
      <FilterBar actor={a} f={f} action="/notas" />

      <form action={reviewManyAction}>
        {review && (
          <div className="mb-3"><button className="btn-secondary" formAction={reviewManyAction}>Marcar selecionadas como revisadas</button></div>
        )}
        {rows.length === 0 ? (
          <div className="card">
            <EmptyState icon={ClipboardList} title="Nenhuma nota encontrada" text="Ajuste os filtros ou lance uma nova nota do cartão." action={<Link href="/notas/nova" className="btn-primary">Lançar nota</Link>} />
          </div>
        ) : (
          <>
            {/* computador: tabela */}
            <div className="card hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/80">
                  <tr>
                    {review && <th className="th w-8"><span className="sr-only">Selecionar</span></th>}
                    <th className="th">Data</th>
                    {a.role !== "USUARIO" && <th className="th">Colaborador</th>}
                    <th className="th">Fornecedor</th>
                    <th className="th">Categoria</th>
                    <th className="th">Status</th>
                    <th className="th text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((e) => (
                    <tr key={e.id} className="transition hover:bg-brand-50/40">
                      {review && <td className="td">{e.status === "LANCADA" && reviewable(e) && <input type="checkbox" name="ids" value={e.id} aria-label={`Selecionar ${e.supplier}`} className="h-4 w-4 rounded border-slate-300" />}</td>}
                      <td className="td whitespace-nowrap text-slate-600">{brDate(e.date)}</td>
                      {a.role !== "USUARIO" && (
                        <td className="td"><div className="flex items-center gap-2.5"><Avatar name={e.user.name} className="!h-8 !w-8" /><div className="leading-tight"><div className="font-medium">{e.user.name}</div><div className="text-xs text-slate-500">{e.sector?.name}</div></div></div></td>
                      )}
                      <td className="td"><Link href={`/notas/${e.id}`} className="font-semibold text-brand-700 hover:underline">{e.supplier}</Link><div className="max-w-xs truncate text-xs text-slate-500">{e.description}</div></td>
                      <td className="td text-slate-600">{e.category.name}</td>
                      <td className="td"><div className="flex flex-wrap items-center gap-1.5"><StatusBadge status={e.status} />{high(e) && <HighBadge />}</div></td>
                      <td className="td whitespace-nowrap text-right font-bold tabular-nums">{formatBRL(e.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* celular: cartões */}
            <ul className="space-y-3 md:hidden">
              {rows.map((e) => (
                <li key={e.id} className="card flex items-start gap-3 p-4">
                  {review && e.status === "LANCADA" && reviewable(e) && <input type="checkbox" name="ids" value={e.id} aria-label={`Selecionar ${e.supplier}`} className="mt-1 h-5 w-5 rounded border-slate-300" />}
                  <Link href={`/notas/${e.id}`} className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><div className="truncate font-semibold">{e.supplier}</div><div className="truncate text-xs text-slate-500">{brDate(e.date)} · {e.category.name}</div></div>
                      <div className="shrink-0 font-bold tabular-nums">{formatBRL(e.amountCents)}</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-slate-500">{a.role === "USUARIO" ? e.description : e.user.name}</span>
                      <div className="flex items-center gap-1.5">{high(e) && <HighBadge />}<StatusBadge status={e.status} /></div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </form>
      <Pagination page={page} pages={Math.ceil(count / PAGE)} base={base} />
    </>
  );
}
