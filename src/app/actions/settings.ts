"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser, toActor } from "@/lib/session";
import { canManageRules, canManageSystem } from "@/lib/permissions";
import { FormState, optStr, str } from "@/lib/form";
import { getCompany, getRules, getSecurity, saveSetting } from "@/lib/settings";
import { ABSOLUTE_MAX_AMOUNT_CENTS, companySchema, rulesSchema, securitySchema, TIMEZONES } from "@/lib/settings-schema";
import { formatBRL, isValidCnpj, onlyDigits, parseMoneyToCents } from "@/lib/validators";
import { monthLabel } from "@/lib/months";

const on = (fd: FormData, k: string) => fd.get(k) === "on";
const optMoney = (fd: FormData, k: string): number | null | "invalid" => {
  const raw = str(fd, k);
  if (!raw) return null;
  const c = parseMoneyToCents(raw);
  return c === null || c > ABSOLUTE_MAX_AMOUNT_CENTS ? "invalid" : c;
};
const optInt = (fd: FormData, k: string): number | null | "invalid" => {
  const raw = str(fd, k);
  if (!raw) return null;
  return /^\d{1,4}$/.test(raw) ? Number(raw) : "invalid";
};
const num = (fd: FormData, k: string) => Number(str(fd, k));

export async function saveRulesAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  if (!canManageRules(toActor(u))) return { error: "Sem permissão." };
  const maxAmount = optMoney(fd, "maxAmount");
  const highlight = optMoney(fd, "highlightAbove");
  const backdate = optInt(fd, "maxBackdateDays");
  if (maxAmount === "invalid") return { error: "Valor máximo por nota inválido." };
  if (highlight === "invalid") return { error: "Valor de destaque inválido." };
  if (backdate === "invalid" || (backdate !== null && backdate > 3650)) return { error: "Dias retroativos inválido (use um número inteiro)." };
  const parsed = rulesSchema.safeParse({
    requireAttachment: on(fd, "requireAttachment"),
    requireCnpj: on(fd, "requireCnpj"),
    requireCostCenter: on(fd, "requireCostCenter"),
    requireProject: on(fd, "requireProject"),
    warnDuplicate: on(fd, "warnDuplicate"),
    managerCanReview: on(fd, "managerCanReview"),
    maxAmountCents: maxAmount,
    maxBackdateDays: backdate,
    highlightAboveCents: highlight,
  });
  if (!parsed.success) return { error: "Revise os valores informados." };
  const before = await getRules();
  await saveSetting("rules", parsed.data, u.id);
  await audit({ actor: u, action: "config.regras_salvas", entity: "Setting", entityId: "rules", meta: { antes: before, depois: parsed.data } });
  revalidatePath("/configuracoes", "layout");
  return { ok: "Regras de lançamento salvas." };
}

export async function saveSecurityAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  if (!canManageSystem(toActor(u))) return { error: "Somente administradores." };
  const parsed = securitySchema.safeParse({
    minPasswordLength: num(fd, "minPasswordLength"),
    maxFailedLogins: num(fd, "maxFailedLogins"),
    lockMinutes: num(fd, "lockMinutes"),
    sessionIdleHours: num(fd, "sessionIdleHours"),
    sessionMaxHours: num(fd, "sessionMaxHours"),
  });
  if (!parsed.success) return { error: "Valores fora dos limites permitidos. Revise os campos." };
  if (parsed.data.sessionIdleHours > parsed.data.sessionMaxHours) return { error: "A inatividade não pode ser maior que a duração máxima da sessão." };
  const before = await getSecurity();
  await saveSetting("security", parsed.data, u.id);
  await audit({ actor: u, action: "config.seguranca_salva", entity: "Setting", entityId: "security", meta: { antes: before, depois: parsed.data } });
  revalidatePath("/configuracoes", "layout");
  return { ok: "Política de acesso salva. Vale para os próximos logins e ações." };
}

export async function saveCompanyAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  if (!canManageSystem(toActor(u))) return { error: "Somente administradores." };
  const cnpj = onlyDigits(str(fd, "cnpj"));
  if (cnpj && !isValidCnpj(cnpj)) return { error: "CNPJ inválido." };
  const tradeName = str(fd, "tradeName");
  if (tradeName.length < 2) return { error: "Informe o nome da empresa." };
  const parsed = companySchema.safeParse({ legalName: str(fd, "legalName"), tradeName, cnpj, timezone: str(fd, "timezone") });
  if (!parsed.success || !TIMEZONES.some((t) => t.id === str(fd, "timezone"))) return { error: "Revise os dados da empresa." };
  const before = await getCompany();
  await saveSetting("company", parsed.data, u.id);
  await audit({ actor: u, action: "config.empresa_salva", entity: "Setting", entityId: "company", meta: { antes: before, depois: parsed.data } });
  revalidatePath("/", "layout");
  return { ok: "Dados da empresa salvos." };
}

export async function closeMonthAction(fd: FormData) {
  const u = await requireUser();
  if (!canManageRules(toActor(u))) return;
  const ym = str(fd, "ym");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym) || ym > new Date().toISOString().slice(0, 7)) return;
  await db.closedMonth.upsert({ where: { yearMonth: ym }, create: { yearMonth: ym, closedById: u.id, note: optStr(fd, "note") }, update: {} });
  await audit({ actor: u, action: "mes.fechado", entity: "ClosedMonth", entityId: ym, meta: { mes: monthLabel(ym) } });
  revalidatePath("/configuracoes/fechamento");
  revalidatePath("/notas");
}

export async function reopenMonthAction(fd: FormData) {
  const u = await requireUser();
  if (!canManageRules(toActor(u))) return;
  const ym = str(fd, "ym");
  await db.closedMonth.deleteMany({ where: { yearMonth: ym } });
  await audit({ actor: u, action: "mes.reaberto", entity: "ClosedMonth", entityId: ym, meta: { mes: ym } });
  revalidatePath("/configuracoes/fechamento");
  revalidatePath("/notas");
}

export async function saveCardAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  if (!canManageRules(toActor(u))) return { error: "Sem permissão." };
  const id = str(fd, "id");
  const label = str(fd, "label");
  const last4 = onlyDigits(str(fd, "last4"));
  const holderId = optStr(fd, "holderId");
  const limit = optMoney(fd, "limit");
  if (label.length < 2 || label.length > 60) return { error: "Dê um nome ao cartão (2 a 60 caracteres)." };
  if (last4.length !== 4) return { error: "Informe os 4 últimos dígitos do cartão." };
  if (limit === "invalid") return { error: "Limite mensal inválido." };
  if (holderId && !(await db.user.findFirst({ where: { id: holderId, active: true, anonymizedAt: null } }))) return { error: "Titular inválido." };
  if (id) {
    await db.card.update({ where: { id }, data: { label, last4, holderId, limitCents: limit } });
    await audit({ actor: u, action: "cartao.editado", entity: "Card", entityId: id });
  } else {
    const c = await db.card.create({ data: { label, last4, holderId, limitCents: limit } });
    await audit({ actor: u, action: "cartao.criado", entity: "Card", entityId: c.id, meta: { final: last4 } });
  }
  revalidatePath("/configuracoes/cartoes");
  return { ok: id ? "Cartão atualizado." : `Cartão adicionado${limit ? ` (limite ${formatBRL(limit)})` : ""}.` };
}

export async function toggleCardAction(fd: FormData) {
  const u = await requireUser();
  if (!canManageRules(toActor(u))) return;
  const id = str(fd, "id");
  const active = fd.get("active") === "1";
  await db.card.update({ where: { id }, data: { active } });
  await audit({ actor: u, action: active ? "cartao.ativado" : "cartao.desativado", entity: "Card", entityId: id });
  revalidatePath("/configuracoes/cartoes");
}
