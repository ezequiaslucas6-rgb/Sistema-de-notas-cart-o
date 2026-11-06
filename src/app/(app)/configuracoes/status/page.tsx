import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { canManageSystem } from "@/lib/permissions";
import { PageTitle } from "@/components/Bits";
import { SettingsShell } from "@/components/SettingsShell";
import { PaneHeader } from "@/components/SettingsUI";

export const metadata = { title: "Status do sistema" };
export const dynamic = "force-dynamic";

const mb = (b: number) => (b / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " MB";
type Check = { label: string; ok: boolean; detail: string };

export default async function StatusPage() {
  await requireRole(canManageSystem);
  const t0 = performance.now();
  await db.$queryRaw`SELECT 1`;
  const latency = Math.round(performance.now() - t0);
  const now = new Date();
  const [dbSize, users, notes, att, sessions, audits, lastAudit] = await Promise.all([
    db.$queryRaw<{ s: bigint }[]>`SELECT pg_database_size(current_database())::bigint AS s`,
    db.user.count({ where: { active: true, anonymizedAt: null } }),
    db.expense.count({ where: { deletedAt: null } }),
    db.attachment.aggregate({ _sum: { size: true }, _count: true }),
    db.session.count({ where: { expiresAt: { gt: now } } }),
    db.auditLog.count(),
    db.auditLog.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);
  const dbBytes = Number(dbSize[0]?.s ?? 0);
  const attBytes = att._sum.size ?? 0;
  const driver = process.env.STORAGE_DRIVER ?? "local";

  const checks: Check[] = [
    { label: "Banco de dados", ok: latency < 1500, detail: `Respondendo em ${latency} ms · ocupa ${mb(dbBytes)}` },
    { label: "Espaço do banco", ok: dbBytes < 400 * 1024 * 1024, detail: dbBytes < 400 * 1024 * 1024 ? "Dentro do limite do plano gratuito (500 MB)." : "Perto do limite de 500 MB do plano gratuito. Considere migrar os anexos para o Storage ou ampliar o plano." },
    { label: "Envio de e-mail", ok: !!process.env.RESEND_API_KEY, detail: process.env.RESEND_API_KEY ? "Resend configurado." : "Sem chave do Resend: e-mails de redefinição de senha e avisos não são enviados." },
    { label: "Armazenamento de anexos", ok: driver !== "local", detail: driver === "db" ? "Anexos guardados no próprio banco de dados." : driver === "supabase" ? "Anexos no Storage privado do Supabase." : "Pasta local (apenas desenvolvimento)." },
    { label: "Chaves de segurança", ok: !!(process.env.DATA_ENCRYPTION_KEY && process.env.CPF_HASH_SECRET && process.env.APP_SECRET), detail: "Criptografia do CPF, hash do CPF e segredo da aplicação." },
    { label: "Rotina diária de limpeza", ok: !!process.env.CRON_SECRET, detail: process.env.CRON_SECRET ? "Agendada na Vercel (todo dia às 06:00 UTC)." : "CRON_SECRET ausente." },
    { label: "Endereço público", ok: !!process.env.APP_URL, detail: process.env.APP_URL ?? "APP_URL ausente (links em e-mails ficam incorretos)." },
  ];
  const stat = (k: string, v: string) => <div className="rounded-xl bg-slate-50 px-4 py-3"><div className="text-xs text-slate-500">{k}</div><div className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{v}</div></div>;

  return (
    <>
      <PageTitle title="Status do sistema" subtitle="Saúde da aplicação, do banco e das configurações" />
      <SettingsShell current="status">
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <PaneHeader title="Verificações" />
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-3 px-5 py-3.5 sm:px-6">
                  <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${c.ok ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <div><div className="text-sm font-semibold text-slate-900">{c.label} <span className="sr-only">{c.ok ? "ok" : "atenção"}</span></div><div className="text-[13px] text-slate-500">{c.detail}</div></div>
                </li>
              ))}
            </ul>
          </section>
          <section className="card p-5 sm:p-6">
            <h2 className="mb-3 font-semibold text-slate-900">Números</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {stat("Usuários ativos", String(users))}
              {stat("Notas lançadas", String(notes))}
              {stat("Anexos", `${att._count} · ${mb(attBytes)}`)}
              {stat("Sessões ativas", String(sessions))}
              {stat("Registros de auditoria", String(audits))}
              {stat("Última atividade", lastAudit ? lastAudit.createdAt.toLocaleString("pt-BR") : "—")}
            </div>
          </section>
          <section className="card p-5 sm:p-6 text-sm text-slate-600">
            <h2 className="mb-2 font-semibold text-slate-900">Versão</h2>
            <p>Ambiente: <b>{process.env.VERCEL_ENV ?? "local"}</b> · Região: <b>{process.env.VERCEL_REGION ?? "—"}</b> · Versão: <b className="font-mono">{process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "desenvolvimento"}</b></p>
          </section>
        </div>
      </SettingsShell>
    </>
  );
}
