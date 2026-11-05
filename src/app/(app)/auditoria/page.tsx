import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { canSeeAudit } from "@/lib/permissions";
import { PageTitle, Pagination } from "@/components/Bits";

export const metadata = { title: "Auditoria" };
export const dynamic = "force-dynamic";
const PAGE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  await requireRole(canSeeAudit);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const where = sp.q ? { OR: [{ action: { contains: sp.q } }, { actorName: { contains: sp.q, mode: "insensitive" as const } }] } : {};
  const [rows, count] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    db.auditLog.count({ where }),
  ]);
  return (
    <>
      <PageTitle title="Auditoria" />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Filtrar por ação ou pessoa" className="input max-w-sm" /><button className="btn-secondary">Filtrar</button></form>
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50"><tr><th className="th">Quando</th><th className="th">Quem</th><th className="th">Ação</th><th className="th hidden md:table-cell">Detalhes</th><th className="th hidden md:table-cell">IP</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="td whitespace-nowrap text-xs">{r.createdAt.toLocaleString("pt-BR", { timeZone: "America/Porto_Velho" })}</td>
                <td className="td">{r.actorName ?? "—"}</td>
                <td className="td font-mono text-xs">{r.action}</td>
                <td className="td hidden max-w-xs truncate font-mono text-xs text-slate-500 md:table-cell">{r.meta ? JSON.stringify(r.meta) : ""}</td>
                <td className="td hidden text-xs text-slate-500 md:table-cell">{r.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={Math.ceil(count / PAGE)} base={`/auditoria${sp.q ? `?q=${encodeURIComponent(sp.q)}` : ""}`} />
    </>
  );
}
