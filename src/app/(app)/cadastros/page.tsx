import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { canManageCatalogs } from "@/lib/permissions";
import { toggleCatalogAction } from "@/app/actions/admin";
import { CatalogForm } from "@/components/AdminForms";
import { PageTitle } from "@/components/Bits";

export const metadata = { title: "Cadastros" };
export const dynamic = "force-dynamic";

type Item = { id: string; name: string; active: boolean; code?: string | null };

function Block({ title, kind, label, items, withCode }: { title: string; kind: string; label: string; items: Item[]; withCode?: boolean }) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      <CatalogForm kind={kind} label={label} withCode={withCode} />
      <ul className="mt-4 divide-y divide-slate-100">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className={i.active ? "" : "text-slate-400 line-through"}>{i.code ? `${i.code} – ` : ""}{i.name}</span>
            <form action={toggleCatalogAction}>
              <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={i.id} /><input type="hidden" name="active" value={i.active ? "0" : "1"} />
              <button className="text-xs text-brand-700 hover:underline">{i.active ? "desativar" : "reativar"}</button>
            </form>
          </li>
        ))}
        {items.length === 0 && <li className="py-2 text-sm text-slate-500">Nada cadastrado.</li>}
      </ul>
    </section>
  );
}

export default async function Catalogs() {
  await requireRole(canManageCatalogs);
  const [sectors, categories, costCenters, projects] = await Promise.all([
    db.sector.findMany({ orderBy: { name: "asc" } }), db.category.findMany({ orderBy: { name: "asc" } }),
    db.costCenter.findMany({ orderBy: { name: "asc" } }), db.project.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <PageTitle title="Cadastros" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Block title="Setores" kind="sector" label="Novo setor" items={sectors} />
        <Block title="Categorias de gasto" kind="category" label="Nova categoria" items={categories} />
        <Block title="Centros de custo" kind="costCenter" label="Novo centro de custo" items={costCenters} withCode />
        <Block title="Projetos" kind="project" label="Novo projeto" items={projects} />
      </div>
    </>
  );
}
