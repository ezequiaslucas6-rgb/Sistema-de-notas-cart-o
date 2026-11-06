import Link from "next/link";
import { db } from "@/lib/db";
import type { ExpenseFilters } from "@/lib/expenses";
import { canSeeAll, type Actor } from "@/lib/permissions";

/** Barra de filtros por GET (funciona sem JavaScript). */
export async function FilterBar({ actor, f, action, exportLinks = false }: { actor: Actor; f: ExpenseFilters; action: string; exportLinks?: boolean }) {
  const seeAll = canSeeAll(actor);
  const seeTeam = seeAll || actor.role === "GESTOR";
  const [cats, ccs, prs, secs, users] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    db.costCenter.findMany({ orderBy: { name: "asc" } }),
    db.project.findMany({ orderBy: { name: "asc" } }),
    seeAll ? db.sector.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    seeTeam ? db.user.findMany({ where: seeAll ? {} : { sectorId: actor.sectorId }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
  ]);
  const qs = new URLSearchParams(Object.entries({ de: f.from, ate: f.to, colaborador: f.userId, setor: f.sectorId, categoria: f.categoryId, centro: f.costCenterId, projeto: f.projectId, status: f.status, q: f.q, min: f.min, max: f.max }).filter(([, v]) => v) as [string, string][]).toString();
  const moreOpen = !!(f.categoryId || f.costCenterId || f.projectId || f.sectorId || f.userId || f.min || f.max);
  const Sel = ({ name, label, value, options }: { name: string; label: string; value?: string; options: { id: string; name: string }[] }) => (
    <label className="block">
      <span className="label">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="input">
        <option value="">Todos</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );
  return (
    <form action={action} method="get" className="card mb-5 mt-5 p-4 first:mt-0">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <label className="block"><span className="label">De</span><input type="date" name="de" defaultValue={f.from} className="input" /></label>
        <label className="block"><span className="label">Até</span><input type="date" name="ate" defaultValue={f.to} className="input" /></label>
        <label className="col-span-2 block lg:col-span-1"><span className="label">Buscar</span><input name="q" defaultValue={f.q} placeholder="Fornecedor, descrição, CNPJ…" className="input" /></label>
        <label className="col-span-2 block lg:col-span-1">
          <span className="label">Status</span>
          <select name="status" defaultValue={f.status} className="input">
            <option value="">Todos</option><option value="LANCADA">Lançada</option><option value="REVISADA">Revisada</option>
          </select>
        </label>
      </div>
      <details className="group mt-3" open={moreOpen}>
        <summary className="cursor-pointer list-none text-sm font-medium text-brand-600 hover:underline">
          <span className="group-open:hidden">+ Mais filtros</span><span className="hidden group-open:inline">− Menos filtros</span>
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Sel name="categoria" label="Categoria" value={f.categoryId} options={cats} />
          <Sel name="centro" label="Centro de custo" value={f.costCenterId} options={ccs} />
          <Sel name="projeto" label="Projeto" value={f.projectId} options={prs} />
          {seeAll && <Sel name="setor" label="Setor" value={f.sectorId} options={secs} />}
          {seeTeam && <Sel name="colaborador" label="Colaborador" value={f.userId} options={users} />}
          <label className="block"><span className="label">Valor mín. (R$)</span><input name="min" inputMode="decimal" defaultValue={f.min} className="input" /></label>
          <label className="block"><span className="label">Valor máx. (R$)</span><input name="max" inputMode="decimal" defaultValue={f.max} className="input" /></label>
        </div>
      </details>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className="btn-primary">Filtrar</button>
        <Link href={action} className="btn-secondary">Limpar</Link>
        {exportLinks && (
          <span className="ml-auto flex flex-wrap gap-2">
            {(["xlsx", "csv", "pdf"] as const).map((fmt) => (
              <a key={fmt} className="btn-secondary" href={`/api/exportar?formato=${fmt}${qs ? "&" + qs : ""}`}>Exportar {fmt.toUpperCase()}</a>
            ))}
          </span>
        )}
      </div>
    </form>
  );
}

export function filtersToQuery(f: ExpenseFilters) {
  return new URLSearchParams(Object.entries({ de: f.from, ate: f.to, colaborador: f.userId, setor: f.sectorId, categoria: f.categoryId, centro: f.costCenterId, projeto: f.projectId, status: f.status, q: f.q, min: f.min, max: f.max }).filter(([, v]) => v) as [string, string][]).toString();
}
