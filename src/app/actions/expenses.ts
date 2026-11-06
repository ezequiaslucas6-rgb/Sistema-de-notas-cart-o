"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser, toActor } from "@/lib/session";
import { canDeleteExpense, canEditExpense, canReviewExpense, canViewExpense } from "@/lib/permissions";
import { getRules } from "@/lib/settings";
import { ABSOLUTE_MAX_AMOUNT_CENTS, backdateMinDate, type Rules } from "@/lib/settings-schema";
import { closedMessage } from "@/lib/months";
import { FormState, optStr, str } from "@/lib/form";
import { isValidCnpj, onlyDigits, parseMoneyToCents } from "@/lib/validators";
import { notifyUsers } from "@/lib/notify";
import { deleteFile } from "@/lib/storage";
import { MAX_FILES_PER_EXPENSE } from "@/lib/files";
import { formatBRL } from "@/lib/validators";

const expenseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  amount: z.string().min(1, "Informe o valor"),
  supplier: z.string().min(2, "Informe o fornecedor").max(160),
  cnpj: z.string().optional(),
  nfeKey: z.string().optional(),
  categoryId: z.string().min(1, "Escolha a categoria"),
  costCenterId: z.string().optional(),
  projectId: z.string().optional(),
  paymentMethod: z.enum(["CREDITO", "DEBITO", "OUTRO"]),
  cardLast4: z.string().optional(),
  description: z.string().min(3, "Descreva o gasto").max(500),
  observation: z.string().max(1000).optional(),
});

function parseExpense(fd: FormData, rules: Rules) {
  const raw = {
    date: str(fd, "date"),
    amount: str(fd, "amount"),
    supplier: str(fd, "supplier"),
    cnpj: str(fd, "cnpj"),
    nfeKey: str(fd, "nfeKey"),
    categoryId: str(fd, "categoryId"),
    costCenterId: str(fd, "costCenterId"),
    projectId: str(fd, "projectId"),
    paymentMethod: str(fd, "paymentMethod") || "CREDITO",
    cardLast4: str(fd, "cardLast4"),
    cardId: str(fd, "cardId"),
    description: str(fd, "description"),
    observation: str(fd, "observation"),
  };
  const parsed = expenseSchema.safeParse(raw);
  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;

  const cents = parseMoneyToCents(raw.amount);
  if (!cents) fieldErrors.amount = "Valor inválido";
  else if (cents > (rules.maxAmountCents ?? ABSOLUTE_MAX_AMOUNT_CENTS)) fieldErrors.amount = `Valor acima do limite permitido (${formatBRL(rules.maxAmountCents ?? ABSOLUTE_MAX_AMOUNT_CENTS)})`;

  const today = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  if (raw.date > today) fieldErrors.date = "A data não pode ser futura";
  if (raw.date < "2000-01-01") fieldErrors.date = "Data inválida";
  const minDate = backdateMinDate(new Date().toISOString().slice(0, 10), rules.maxBackdateDays);
  if (minDate && raw.date < minDate) fieldErrors.date = `A data não pode ser anterior a ${rules.maxBackdateDays} dia(s)`;

  const cnpj = onlyDigits(raw.cnpj);
  if (cnpj && !isValidCnpj(cnpj)) fieldErrors.cnpj = "CNPJ inválido";
  const nfeKey = onlyDigits(raw.nfeKey);
  if (nfeKey && nfeKey.length !== 44) fieldErrors.nfeKey = "A chave de acesso tem 44 dígitos";
  const card = onlyDigits(raw.cardLast4);
  if (raw.cardLast4 && card.length !== 4) fieldErrors.cardLast4 = "Informe os 4 últimos dígitos";
  if (rules.requireCnpj && !cnpj && !fieldErrors.cnpj) fieldErrors.cnpj = "Informe o CNPJ do fornecedor";
  if (rules.requireCostCenter && !raw.costCenterId) fieldErrors.costCenterId = "Escolha o centro de custo";
  if (rules.requireProject && !raw.projectId) fieldErrors.projectId = "Escolha o projeto";

  return { raw, cents, cnpj, nfeKey, card, fieldErrors, data: raw as Record<string, string> };
}

/** Resolve o cartão escolhido (precisa estar ativo e ser do titular) e devolve os 4 últimos dígitos. */
async function resolveCard(cardId: string, holderId: string): Promise<{ id: string; last4: string } | null | "invalid"> {
  if (!cardId) return null;
  const c = await db.card.findFirst({ where: { id: cardId, active: true, OR: [{ holderId }, { holderId: null }] } });
  return c ? { id: c.id, last4: c.last4 } : "invalid";
}

async function validateRefs(raw: { categoryId: string; costCenterId?: string; projectId?: string }) {
  const [cat, cc, pr] = await Promise.all([
    db.category.findFirst({ where: { id: raw.categoryId, active: true } }),
    raw.costCenterId ? db.costCenter.findFirst({ where: { id: raw.costCenterId, active: true } }) : Promise.resolve(true),
    raw.projectId ? db.project.findFirst({ where: { id: raw.projectId, active: true } }) : Promise.resolve(true),
  ]);
  return !!cat && !!cc && !!pr;
}

export async function createExpenseAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const rules = await getRules();
  const p = parseExpense(fd, rules);
  const attachmentIds = fd.getAll("attachmentIds").map(String).filter(Boolean).slice(0, MAX_FILES_PER_EXPENSE);
  if (rules.requireAttachment && !attachmentIds.length) p.fieldErrors.attachments = "Anexe ao menos uma foto, PDF ou XML da nota";
  const myCards = await db.card.count({ where: { holderId: u.id, active: true } });
  const card = await resolveCard(p.raw.cardId, u.id);
  if (card === "invalid") p.fieldErrors.cardId = "Cartão inválido";
  else if (!card && myCards > 0) p.fieldErrors.cardId = "Selecione o cartão usado";
  if (Object.keys(p.fieldErrors).length) return { error: "Revise os campos destacados.", fieldErrors: p.fieldErrors, data: p.data };
  if (!(await validateRefs(p.raw))) return { error: "Categoria, centro de custo ou projeto inválido.", data: p.data };
  const date = new Date(p.raw.date + "T00:00:00Z");
  const closed = await closedMessage(date);
  if (closed) return { error: closed, fieldErrors: { date: "Mês fechado" }, data: p.data };

  const files = attachmentIds.length ? await db.attachment.findMany({ where: { id: { in: attachmentIds }, uploadedBy: u.id, expenseId: null } }) : [];
  if (files.length !== attachmentIds.length) return { error: "Algum anexo expirou. Anexe novamente.", data: p.data };

  // Proteção contra duplicidade (mesmo usuário, data, valor e fornecedor)
  const dup = rules.warnDuplicate
    ? await db.expense.findFirst({ where: { userId: u.id, deletedAt: null, date, amountCents: p.cents!, supplier: { equals: p.raw.supplier, mode: "insensitive" } } })
    : null;
  if (dup && fd.get("confirmDup") !== "on") {
    return { error: "Já existe uma nota sua com mesma data, valor e fornecedor. Marque a confirmação para lançar mesmo assim.", fieldErrors: { dup: "1" }, data: p.data };
  }

  const expense = await db.expense.create({
    data: {
      userId: u.id,
      sectorId: u.sectorId,
      date,
      amountCents: p.cents!,
      supplier: p.raw.supplier,
      cnpj: p.cnpj || null,
      nfeKey: p.nfeKey || null,
      categoryId: p.raw.categoryId,
      costCenterId: p.raw.costCenterId || null,
      projectId: p.raw.projectId || null,
      paymentMethod: p.raw.paymentMethod as "CREDITO" | "DEBITO" | "OUTRO",
      cardId: card && card !== "invalid" ? card.id : null,
      cardLast4: card && card !== "invalid" ? card.last4 : p.card || null,
      description: p.raw.description,
      observation: p.raw.observation || null,
      attachments: { connect: files.map((f) => ({ id: f.id })) },
    },
  });
  await audit({ actor: u, action: "nota.criada", entity: "Expense", entityId: expense.id, meta: { valor: p.cents, fornecedor: p.raw.supplier } });

  const recipients = await db.user.findMany({
    where: { active: true, id: { not: u.id }, OR: [{ role: { in: ["ADMIN", "FINANCEIRO"] } }, ...(u.sectorId ? [{ role: "GESTOR" as const, sectorId: u.sectorId }] : [])] },
    select: { id: true },
  });
  await notifyUsers(
    recipients.map((r) => r.id),
    { title: "Nova nota lançada", body: `${u.name} lançou ${formatBRL(p.cents!)} – ${p.raw.supplier}`, link: `/notas/${expense.id}` },
    { email: process.env.NOTIFY_EMAIL_ON_NEW === "true" },
  );

  revalidatePath("/painel");
  revalidatePath("/notas");
  redirect(`/notas/${expense.id}?criada=1`);
}

export async function updateExpenseAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  if (!canEditExpense(toActor(u))) return { error: "Sem permissão para editar notas." };
  const id = str(fd, "id");
  const current = await db.expense.findFirst({ where: { id, deletedAt: null } });
  if (!current) return { error: "Nota não encontrada." };
  const rules = await getRules();
  const p = parseExpense(fd, rules);
  const card = await resolveCard(p.raw.cardId, current.userId);
  if (card === "invalid") p.fieldErrors.cardId = "Cartão inválido";
  if (Object.keys(p.fieldErrors).length) return { error: "Revise os campos destacados.", fieldErrors: p.fieldErrors, data: p.data };
  if (!(await validateRefs(p.raw))) return { error: "Categoria, centro de custo ou projeto inválido.", data: p.data };
  const newDate = new Date(p.raw.date + "T00:00:00Z");
  const closed = await closedMessage(current.date, newDate);
  if (closed) return { error: closed, data: p.data };

  await db.expense.update({
    where: { id },
    data: {
      date: newDate,
      amountCents: p.cents!,
      supplier: p.raw.supplier,
      cnpj: p.cnpj || null,
      nfeKey: p.nfeKey || null,
      categoryId: p.raw.categoryId,
      costCenterId: p.raw.costCenterId || null,
      projectId: p.raw.projectId || null,
      paymentMethod: p.raw.paymentMethod as "CREDITO" | "DEBITO" | "OUTRO",
      cardId: card && card !== "invalid" ? card.id : null,
      cardLast4: card && card !== "invalid" ? card.last4 : p.card || null,
      description: p.raw.description,
      observation: p.raw.observation || null,
    },
  });
  await audit({
    actor: u,
    action: "nota.editada",
    entity: "Expense",
    entityId: id,
    meta: { antes: { valor: current.amountCents, fornecedor: current.supplier, data: current.date.toISOString().slice(0, 10) }, depois: { valor: p.cents, fornecedor: p.raw.supplier, data: p.raw.date } },
  });
  revalidatePath("/notas");
  redirect(`/notas/${id}?editada=1`);
}

export async function reviewExpenseAction(fd: FormData) {
  const u = await requireUser();
  const id = str(fd, "id");
  const note = optStr(fd, "note");
  const undo = fd.get("undo") === "1";
  const e = await db.expense.findFirst({ where: { id, deletedAt: null } });
  if (!e) return;
  const rules = await getRules();
  if (!canReviewExpense(toActor(u), e, rules.managerCanReview)) return;
  await db.expense.update({
    where: { id },
    data: undo ? { status: "LANCADA", reviewedById: null, reviewedAt: null, reviewNote: null } : { status: "REVISADA", reviewedById: u.id, reviewedAt: new Date(), reviewNote: note },
  });
  await audit({ actor: u, action: undo ? "nota.revisao_desfeita" : "nota.revisada", entity: "Expense", entityId: id });
  if (!undo && e.userId !== u.id) {
    await notifyUsers([e.userId], { title: "Sua nota foi revisada", body: `${e.supplier} – ${formatBRL(e.amountCents)}${note ? ` · ${note}` : ""}`, link: `/notas/${id}` }, { email: true });
  }
  revalidatePath(`/notas/${id}`);
  revalidatePath("/notas");
}

export async function reviewManyAction(fd: FormData) {
  const u = await requireUser();
  const ids = fd.getAll("ids").map(String).slice(0, 200);
  if (!ids.length) return;
  const rules = await getRules();
  const found = await db.expense.findMany({ where: { id: { in: ids }, deletedAt: null, status: "LANCADA" } });
  const rows = found.filter((r) => canReviewExpense(toActor(u), r, rules.managerCanReview));
  await db.expense.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { status: "REVISADA", reviewedById: u.id, reviewedAt: new Date() } });
  await audit({ actor: u, action: "nota.revisada_em_lote", meta: { quantidade: rows.length } });
  const byUser = new Map<string, number>();
  rows.forEach((r) => r.userId !== u.id && byUser.set(r.userId, (byUser.get(r.userId) ?? 0) + 1));
  for (const [uid, n] of byUser) await notifyUsers([uid], { title: "Notas revisadas", body: `${n} nota(s) sua(s) foram revisadas.`, link: "/notas" });
  revalidatePath("/notas");
}

export async function deleteExpenseAction(fd: FormData) {
  const u = await requireUser();
  if (!canDeleteExpense(toActor(u))) return;
  const id = str(fd, "id");
  const e = await db.expense.findFirst({ where: { id, deletedAt: null }, include: { attachments: true } });
  if (!e) return;
  if (await closedMessage(e.date)) redirect(`/notas/${id}?fechado=1`);
  await db.expense.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit({ actor: u, action: "nota.excluida", entity: "Expense", entityId: id, meta: { valor: e.amountCents, fornecedor: e.supplier } });
  revalidatePath("/notas");
  redirect("/notas?excluida=1");
}

/** Colaborador (e demais perfis com acesso) pode acrescentar observações depois do lançamento. */
export async function addCommentAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const id = str(fd, "id");
  const text = str(fd, "text");
  if (text.length < 2) return { error: "Escreva a observação." };
  if (text.length > 1000) return { error: "Máximo de 1000 caracteres." };
  const e = await db.expense.findFirst({ where: { id, deletedAt: null } });
  if (!e || !canViewExpense(toActor(u), e)) return { error: "Nota não encontrada." };
  await db.expenseComment.create({ data: { expenseId: id, userId: u.id, text } });
  await audit({ actor: u, action: "nota.observacao", entity: "Expense", entityId: id });
  if (e.userId !== u.id) await notifyUsers([e.userId], { title: "Nova observação na sua nota", body: `${u.name}: ${text.slice(0, 120)}`, link: `/notas/${id}` });
  else {
    const fin = await db.user.findMany({ where: { active: true, role: { in: ["ADMIN", "FINANCEIRO"] }, id: { not: u.id } }, select: { id: true } });
    await notifyUsers(fin.map((f) => f.id), { title: "Observação em nota", body: `${u.name}: ${text.slice(0, 120)}`, link: `/notas/${id}` });
  }
  revalidatePath(`/notas/${id}`);
  return { ok: "Observação adicionada." };
}

export async function removeAttachmentAction(fd: FormData) {
  const u = await requireUser();
  if (!canEditExpense(toActor(u))) return;
  const att = await db.attachment.findUnique({ where: { id: str(fd, "id") }, include: { expense: true } });
  if (!att?.expenseId || !att.expense) return;
  if (await closedMessage(att.expense.date)) return;
  const count = await db.attachment.count({ where: { expenseId: att.expenseId } });
  if (count <= 1) return; // a nota precisa manter ao menos um anexo
  await db.attachment.delete({ where: { id: att.id } });
  await deleteFile(att.storageKey);
  await audit({ actor: u, action: "anexo.removido", entity: "Expense", entityId: att.expenseId, meta: { arquivo: att.filename } });
  revalidatePath(`/notas/${att.expenseId}`);
}

/** Busca a razão social pelo CNPJ (BrasilAPI) para pré-preencher o fornecedor. */
export async function lookupCnpjAction(cnpj: string): Promise<{ name?: string }> {
  const u = await requireUser();
  const digits = onlyDigits(cnpj);
  if (!isValidCnpj(digits)) return {};
  const { rateLimit } = await import("@/lib/ratelimit");
  if (!(await rateLimit(`cnpj:${u.id}`, 30, 10 * 60)).ok) return {};
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, { signal: AbortSignal.timeout(4000), cache: "force-cache", next: { revalidate: 86400 } });
    if (!res.ok) return {};
    const j = (await res.json()) as { nome_fantasia?: string; razao_social?: string };
    return { name: (j.nome_fantasia || j.razao_social || "").slice(0, 160) || undefined };
  } catch {
    return {};
  }
}
