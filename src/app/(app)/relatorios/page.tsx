import { db } from "@/lib/db";
import { requireRole, toActor } from "@/lib/session";
import { canExport } from "@/lib/permissions";
import { buildWhere, readFilters, type SP } from "@/lib/expenses";
import { formatBRL } from "@/lib/validators";
import { FilterBar } from "@/components/FilterBar";
import { BarList, Kpi, PageTitle } from "@/components/Bits";

export const metadata = { title: "Relatórios" };
export const dynamic = "force-dynamic";

export default async function Reports({ searchParams }: { searchParams: Promise<SP> }) {
  const u = await requireRole(canExport);
  const a = toActor(u);
  const f = readFilters(await searchParams);
  const where = buildWhere(a, f);
  const sum = (x: { _sum: { amountCents: number | null } }) => x._sum.amountCents ?? 0;

  const [tot, byCat, bySec, byUser, byCc, byPr] = await Promise.all([
    db.expense.aggregate({ where, _sum: { amountCents: true }, _count: true }),
    db.expense.groupBy({ by: ["categoryId"], where, _sum: { amountCents: true }, orderBy: { _sum: { amountCents: "desc" } } }),
    db.expense.groupBy({ by: ["sectorId"], where, _sum: { amountCents: true }, orderBy: { _sum: { amountCents: "desc" } } }),
    db.expense.groupBy({ by: ["userId"], where, _sum: { amountCents: true }, orderBy: { _sum: { amountCents: "desc" } }, take: 15 }),
    db.expense.groupBy({ by: ["costCenterId"], where, _sum: { amountCents: true }, orderBy: { _sum: { amountCents: "desc" } } }),
    db.expense.groupBy({ by: ["projectId"], where, _sum: { amountCents: true }, orderBy: { _sum: { amountCents: "desc" } } }),
  ]);
  const [cats, secs, users, ccs, prs] = await Promise.all([
    db.category.findMany(), db.sector.findMany(), db.user.findMany({ where: { id: { in: byUser.map((x) => x.userId) } }, select: { id: true, name: true } }),
    db.costCenter.findMany(), db.project.findMany(),
  ]);
  const nm = <T extends { id: string; name: string }>(list: T[], id: string | null, fallback: string) => list.find((x) => x.id === id)?.name ?? fallback;

  return (
    <>
      <PageTitle title="Relatórios" subtitle="Filtre, analise e exporte em Excel, CSV ou PDF" />
      <FilterBar actor={a} f={f} action="/relatorios" exportLinks />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Kpi label="Total no filtro" value={formatBRL(sum(tot))} />
        <Kpi label="Notas" value={String(tot._count)} />
        <Kpi label="Ticket médio" value={formatBRL(tot._count ? Math.round(sum(tot) / tot._count) : 0)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5"><h2 className="mb-4 font-semibold">Por categoria</h2><BarList format={formatBRL} rows={byCat.map((x) => ({ label: nm(cats, x.categoryId, "—"), value: sum(x) }))} /></section>
        <section className="card p-5"><h2 className="mb-4 font-semibold">Por setor</h2><BarList format={formatBRL} rows={bySec.map((x) => ({ label: nm(secs, x.sectorId, "Sem setor"), value: sum(x) }))} /></section>
        <section className="card p-5"><h2 className="mb-4 font-semibold">Por colaborador (top 15)</h2><BarList format={formatBRL} rows={byUser.map((x) => ({ label: nm(users, x.userId, "—"), value: sum(x) }))} /></section>
        <section className="card p-5"><h2 className="mb-4 font-semibold">Por centro de custo</h2><BarList format={formatBRL} rows={byCc.map((x) => ({ label: nm(ccs, x.costCenterId, "Sem centro de custo"), value: sum(x) }))} /></section>
        <section className="card p-5"><h2 className="mb-4 font-semibold">Por projeto</h2><BarList format={formatBRL} rows={byPr.map((x) => ({ label: nm(prs, x.projectId, "Sem projeto"), value: sum(x) }))} /></section>
      </div>
    </>
  );
}
