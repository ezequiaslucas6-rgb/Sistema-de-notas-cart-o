import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Paperclip } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser, toActor } from "@/lib/session";
import { canDeleteExpense, canEditExpense, canReview, canViewExpense } from "@/lib/permissions";
import { PAYMENT_LABEL, brDate, expenseInclude } from "@/lib/expenses";
import { formatBRL, formatCnpj } from "@/lib/validators";
import { PageTitle, StatusBadge } from "@/components/Bits";
import { CommentForm } from "@/components/CommentForm";
import { ConfirmButton } from "@/components/ui";
import { deleteExpenseAction, removeAttachmentAction, reviewExpenseAction } from "@/app/actions/expenses";

export const metadata = { title: "Nota" };
export const dynamic = "force-dynamic";

export default async function ExpenseDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criada?: string; editada?: string }> }) {
  const u = await requireUser();
  const a = toActor(u);
  const { id } = await params;
  const sp = await searchParams;
  const e = await db.expense.findFirst({
    where: { id, deletedAt: null },
    include: { ...expenseInclude, attachments: { orderBy: { createdAt: "asc" } }, comments: { orderBy: { createdAt: "asc" }, include: { user: { select: { name: true, role: true } } } } },
  });
  if (!e || !canViewExpense(a, e)) notFound();
  const history = canEditExpense(a)
    ? await db.auditLog.findMany({ where: { entity: "Expense", entityId: id }, orderBy: { createdAt: "desc" }, take: 15 })
    : [];

  const row = (k: string, v: React.ReactNode) => (v ? <div className="grid grid-cols-3 gap-2 py-2 text-sm"><dt className="text-slate-500">{k}</dt><dd className="col-span-2 break-words">{v}</dd></div> : null);

  return (
    <>
      <PageTitle
        title={e.supplier}
        subtitle={`${brDate(e.date)} · ${e.category.name} · ${e.user.name}`}
        notice={sp.criada ? { text: "Nota lançada com sucesso!" } : sp.editada ? { text: "Nota atualizada." } : undefined}
      >
        <Link href="/notas" className="btn-secondary">← Voltar</Link>
        {canEditExpense(a) && <Link href={`/notas/${e.id}/editar`} className="btn-secondary">Editar</Link>}
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-3xl font-bold tracking-tight tabular-nums text-slate-900">{formatBRL(e.amountCents)}</div>
            <StatusBadge status={e.status} />
          </div>
          <dl className="divide-y divide-slate-100">
            {row("Data", brDate(e.date))}
            {row("Colaborador", `${e.user.name}${e.sector ? ` · ${e.sector.name}` : ""}`)}
            {row("CNPJ", e.cnpj && formatCnpj(e.cnpj))}
            {row("Categoria", e.category.name)}
            {row("Centro de custo", e.costCenter && `${e.costCenter.code ? e.costCenter.code + " – " : ""}${e.costCenter.name}`)}
            {row("Projeto", e.project?.name)}
            {row("Pagamento", `${PAYMENT_LABEL[e.paymentMethod]}${e.cardLast4 ? ` · final ${e.cardLast4}` : ""}`)}
            {row("Descrição", e.description)}
            {row("Observação", e.observation)}
            {row("Chave NF-e", e.nfeKey)}
            {row("Lançada em", e.createdAt.toLocaleString("pt-BR", { timeZone: "America/Porto_Velho" }))}
            {e.status === "REVISADA" && row("Revisada por", `${e.reviewedBy?.name ?? "—"} em ${e.reviewedAt?.toLocaleString("pt-BR", { timeZone: "America/Porto_Velho" })}${e.reviewNote ? ` · ${e.reviewNote}` : ""}`)}
          </dl>
        </section>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold"><Paperclip className="h-4 w-4" /> Anexos</h2>
            <ul className="grid grid-cols-2 gap-3">
              {e.attachments.map((f) => {
                const isImg = f.mime.startsWith("image/");
                return (
                  <li key={f.id} className="overflow-hidden rounded-xl border border-slate-200">
                    <a href={`/api/anexos/${f.id}`} target="_blank" rel="noopener" className="block">
                      {isImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/anexos/${f.id}`} alt={f.filename} loading="lazy" className="h-28 w-full bg-slate-50 object-cover" />
                      ) : (
                        <div className="grid h-28 place-items-center bg-slate-50 text-slate-400"><FileText className="h-9 w-9" aria-hidden /><span className="text-[11px] font-semibold uppercase">{f.mime === "application/pdf" ? "PDF" : "XML"}</span></div>
                      )}
                      <div className="truncate px-2.5 py-1.5 text-xs text-brand-700">{f.filename}</div>
                    </a>
                    {canEditExpense(a) && e.attachments.length > 1 && (
                      <form action={removeAttachmentAction} className="border-t border-slate-100 px-2.5 py-1"><input type="hidden" name="id" value={f.id} /><ConfirmButton className="text-xs text-red-600 hover:underline" message="Remover este anexo?">remover</ConfirmButton></form>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {canReview(a) && (
            <section className="card p-5">
              <h2 className="mb-3 font-semibold">Revisão</h2>
              {e.status === "LANCADA" ? (
                <form action={reviewExpenseAction} className="space-y-2">
                  <input type="hidden" name="id" value={e.id} />
                  <input name="note" className="input" placeholder="Observação da revisão (opcional)" maxLength={300} />
                  <button className="btn-primary w-full">Marcar como revisada</button>
                </form>
              ) : (
                <form action={reviewExpenseAction}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="undo" value="1" /><button className="btn-secondary w-full">Reabrir (voltar para lançada)</button></form>
              )}
            </section>
          )}

          {canDeleteExpense(a) && (
            <form action={deleteExpenseAction}>
              <input type="hidden" name="id" value={e.id} />
              <ConfirmButton message="Excluir esta nota? A ação fica registrada na auditoria.">Excluir nota</ConfirmButton>
            </form>
          )}
        </aside>
      </div>

      <section className="card mt-6 p-5">
        <h2 className="mb-3 font-semibold">Observações</h2>
        {e.comments.length === 0 && <p className="mb-3 text-sm text-slate-500">Nenhuma observação adicionada.</p>}
        <ul className="mb-4 space-y-3">
          {e.comments.map((c) => (
            <li key={c.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <div className="mb-0.5 text-xs text-slate-500">{c.user.name} · {c.createdAt.toLocaleString("pt-BR", { timeZone: "America/Porto_Velho" })}</div>
              <p className="whitespace-pre-wrap break-words">{c.text}</p>
            </li>
          ))}
        </ul>
        <CommentForm expenseId={e.id} />
      </section>

      {history.length > 0 && (
        <section className="card mt-6 p-5">
          <h2 className="mb-3 font-semibold">Histórico</h2>
          <ul className="space-y-1 text-sm text-slate-600">
            {history.map((h) => <li key={h.id}>{h.createdAt.toLocaleString("pt-BR", { timeZone: "America/Porto_Velho" })} · <strong>{h.actorName ?? "sistema"}</strong> · {h.action}</li>)}
          </ul>
        </section>
      )}
    </>
  );
}
