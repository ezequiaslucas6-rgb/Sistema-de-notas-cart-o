import { CalendarCheck, Lock, LockOpen } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { canManageRules } from "@/lib/permissions";
import { getCompany } from "@/lib/settings";
import { monthLabel } from "@/lib/months";
import { formatBRL } from "@/lib/validators";
import { closeMonthAction, reopenMonthAction } from "@/app/actions/settings";
import { PageTitle } from "@/components/Bits";
import { SettingsShell } from "@/components/SettingsShell";
import { PaneHeader } from "@/components/SettingsUI";
import { ConfirmButton } from "@/components/ui";

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
export const metadata = { title: "Fechamento do mês" };
export const dynamic = "force-dynamic";

export default async function ClosingPage() {
  await requireRole(canManageRules);
  const tz = (await getCompany()).timezone;
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
  const since = new Date(months[months.length - 1] + "-01T00:00:00Z");
  const [stats, closed] = await Promise.all([
    db.$queryRaw<{ ym: string; n: number; total: bigint; pend: number }[]>`
      SELECT to_char("date", 'YYYY-MM') AS ym, count(*)::int AS n, COALESCE(sum("amountCents"), 0)::bigint AS total,
             (count(*) FILTER (WHERE "status" = 'LANCADA'))::int AS pend
      FROM "Expense" WHERE "deletedAt" IS NULL AND "date" >= ${since} GROUP BY 1`,
    db.closedMonth.findMany({ where: { yearMonth: { in: months } }, include: { closedBy: { select: { name: true } } } }),
  ]);
  const byMonth = new Map(stats.map((s) => [s.ym, s]));
  const closedBy = new Map(closed.map((c) => [c.yearMonth, c]));

  return (
    <>
      <PageTitle title="Fechamento do mês" subtitle="Bloqueie lançamentos e edições de meses já conferidos" />
      <SettingsShell current="fechamento">
        <div className="card overflow-hidden">
          <PaneHeader title="Meses" text="Mês fechado não aceita novas notas, edições, exclusões nem troca de anexos. Observações continuam permitidas. Reabra se precisar corrigir algo." />
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {months.map((ym) => {
              const s = byMonth.get(ym);
              const c = closedBy.get(ym);
              return (
                <li key={ym} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${c ? "bg-violet-100 text-violet-600" : "bg-slate-100 text-slate-500"}`}>{c ? <Lock className="h-[18px] w-[18px]" aria-hidden /> : <CalendarCheck className="h-[18px] w-[18px]" aria-hidden />}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{cap(monthLabel(ym))}</div>
                      <div className="text-xs text-slate-500">
                        {s ? `${s.n} nota${s.n === 1 ? "" : "s"} · ${formatBRL(Number(s.total))}${s.pend ? ` · ${s.pend} pendente${s.pend === 1 ? "" : "s"} de revisão` : " · tudo revisado"}` : "Sem notas"}
                      </div>
                      {c && <div className="text-xs text-violet-700">Fechado por {c.closedBy.name} em {c.closedAt.toLocaleDateString("pt-BR", { timeZone: tz })}</div>}
                    </div>
                  </div>
                  {c ? (
                    <form action={reopenMonthAction}><input type="hidden" name="ym" value={ym} /><ConfirmButton className="btn-secondary" message={`Reabrir ${monthLabel(ym)}? Os lançamentos e edições voltam a ser permitidos.`}><LockOpen className="h-4 w-4" aria-hidden /> Reabrir</ConfirmButton></form>
                  ) : (
                    <form action={closeMonthAction}>
                      <input type="hidden" name="ym" value={ym} />
                      <ConfirmButton className="btn-primary" message={s?.pend ? `Há ${s.pend} nota(s) ainda não revisadas em ${monthLabel(ym)}. Fechar o mês mesmo assim?` : `Fechar ${monthLabel(ym)}? Não será possível lançar nem editar notas desse mês.`}><Lock className="h-4 w-4" aria-hidden /> Fechar mês</ConfirmButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </SettingsShell>
    </>
  );
}
