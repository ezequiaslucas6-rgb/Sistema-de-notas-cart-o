import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { canManageIntegrations } from "@/lib/permissions";
import { revokeApiTokenAction } from "@/app/actions/admin";
import { ApiTokenForm } from "@/components/AdminForms";
import { ConfirmButton } from "@/components/ui";
import { PageTitle } from "@/components/Bits";
import { env } from "@/lib/env";

export const metadata = { title: "Integrações" };
export const dynamic = "force-dynamic";

export default async function Integrations() {
  await requireRole(canManageIntegrations);
  const tokens = await db.apiToken.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageTitle title="Integrações" />
      <section className="card mb-6 p-5">
        <h2 className="mb-2 font-semibold">API somente leitura</h2>
        <p className="mb-3 text-sm text-slate-600">Permite que contabilidade, ERP ou planilhas consultem as notas. Cada sistema recebe um token próprio que pode ser revogado a qualquer momento.</p>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{`curl -H "Authorization: Bearer nt_SEU_TOKEN" \\\n  "${env.appUrl}/api/v1/notas?de=2025-01-01&ate=2025-01-31&status=REVISADA"`}</pre>
        <div className="mt-4"><ApiTokenForm /></div>
      </section>
      <section className="card divide-y divide-slate-100">
        {tokens.length === 0 && <p className="p-5 text-sm text-slate-500">Nenhum token criado.</p>}
        {tokens.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
            <div><div className="font-medium">{t.name} <span className="font-mono text-xs text-slate-400">{t.prefix}…</span></div><div className="text-xs text-slate-500">Criado em {t.createdAt.toLocaleDateString("pt-BR")} · {t.lastUsedAt ? `último uso ${t.lastUsedAt.toLocaleDateString("pt-BR")}` : "nunca usado"}</div></div>
            {t.revokedAt ? <span className="badge bg-slate-200 text-slate-600">Revogado</span> : <form action={revokeApiTokenAction}><input type="hidden" name="id" value={t.id} /><ConfirmButton className="btn-secondary" message="Revogar este token?">Revogar</ConfirmButton></form>}
          </div>
        ))}
      </section>
    </>
  );
}
