import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser, toActor } from "@/lib/session";
import { canReview } from "@/lib/permissions";
import { brDate, buildWhere, expenseInclude, readFilters, monthRange, type SP } from "@/lib/expenses";
import { formatBRL } from "@/lib/validators";
import { FilterBar, filtersToQuery } from "@/components/FilterBar";
import { Kpi, PageTitle, Pagination, StatusBadge } from "@/components/Bits";
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
  const review = canReview(a);
  const base = `/notas${filtersToQuery(f) ? "?" + filtersToQuery(f) : ""}`;

  return (
    <>
      <PageTitle title={a.role === "USUARIO" ? "Minhas notas" : "Notas lançadas"}>
        <Link href="/notas/nova" className="btn-primary">+ Lançar nota</Link>
      </PageTitle>
      {monthSum && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <Kpi label="Total usado neste mês" value={formatBRL(monthSum._sum.amountCents ?? 0)} />
          <Kpi label="Total do filtro atual" value={formatBRL(sum._sum.amountCents ?? 0)} hint={`${count} nota(s)`} />
        </div>
      )}
      <FilterBar actor={a} f={f} action="/notas" />
      {!monthSum && <p className="mb-3 text-sm text-slate-600"><strong>{count}</strong> nota(s) · total <strong>{formatBRL(sum._sum.amountCents ?? 0)}</strong></p>}

      <form action={reviewManyAction}>
        {review && rows.some((r) => r.status === "LANCADA") && (
          <div className="mb-3"><button className="btn-secondary" formAction={reviewManyAction}>Marcar selecionadas como revisadas</button></div>
        )}
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {review && <th className="th w-8"><span className="sr-only">Selecionar</span></th>}
                <th className="th">Data</th>
                {a.role !== "USUARIO" && <th className="th">Colaborador</th>}
                <th className="th">Fornecedor</th>
                <th className="th hidden md:table-cell">Categoria</th>
                <th className="th">Status</th>
                <th className="th text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && <tr><td colSpan={7} className="td py-10 text-center text-slate-500">Nenhuma nota encontrada.</td></tr>}
              {rows.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  {review && <td className="td">{e.status === "LANCADA" && <input type="checkbox" name="ids" value={e.id} aria-label={`Selecionar ${e.supplier}`} className="h-4 w-4" />}</td>}
                  <td className="td whitespace-nowrap">{brDate(e.date)}</td>
                  {a.role !== "USUARIO" && <td className="td">{e.user.name}<div className="text-xs text-slate-500">{e.sector?.name}</div></td>}
                  <td className="td"><Link href={`/notas/${e.id}`} className="font-medium text-brand-700 hover:underline">{e.supplier}</Link><div className="max-w-xs truncate text-xs text-slate-500">{e.description}</div></td>
                  <td className="td hidden md:table-cell">{e.category.name}</td>
                  <td className="td"><StatusBadge status={e.status} /></td>
                  <td className="td whitespace-nowrap text-right font-semibold tabular-nums">{formatBRL(e.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>
      <Pagination page={page} pages={Math.ceil(count / PAGE)} base={base} />
    </>
  );
}
