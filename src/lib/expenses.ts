import "server-only";
import type { Prisma } from "@prisma/client";
import { expenseScope, type Actor } from "./permissions";
import { onlyDigits, parseMoneyToCents } from "./validators";

export type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export type ExpenseFilters = {
  from?: string;
  to?: string;
  userId?: string;
  sectorId?: string;
  categoryId?: string;
  costCenterId?: string;
  projectId?: string;
  status?: "LANCADA" | "REVISADA" | "";
  q?: string;
  min?: string;
  max?: string;
};

export function readFilters(sp: SP): ExpenseFilters {
  const status = one(sp.status);
  return {
    from: one(sp.de),
    to: one(sp.ate),
    userId: one(sp.colaborador),
    sectorId: one(sp.setor),
    categoryId: one(sp.categoria),
    costCenterId: one(sp.centro),
    projectId: one(sp.projeto),
    status: status === "LANCADA" || status === "REVISADA" ? status : "",
    q: one(sp.q).slice(0, 100),
    min: one(sp.min),
    max: one(sp.max),
  };
}

const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Monta o `where` já combinado com o escopo de permissões do ator. */
export function buildWhere(actor: Actor, f: ExpenseFilters): Prisma.ExpenseWhereInput {
  const and: Prisma.ExpenseWhereInput[] = [expenseScope(actor)];
  if (isDate(f.from)) and.push({ date: { gte: new Date(f.from + "T00:00:00Z") } });
  if (isDate(f.to)) and.push({ date: { lte: new Date(f.to + "T00:00:00Z") } });
  if (f.userId) and.push({ userId: f.userId });
  if (f.sectorId) and.push({ sectorId: f.sectorId });
  if (f.categoryId) and.push({ categoryId: f.categoryId });
  if (f.costCenterId) and.push({ costCenterId: f.costCenterId });
  if (f.projectId) and.push({ projectId: f.projectId });
  if (f.status) and.push({ status: f.status });
  const min = f.min ? parseMoneyToCents(f.min) : null;
  const max = f.max ? parseMoneyToCents(f.max) : null;
  if (min) and.push({ amountCents: { gte: min } });
  if (max) and.push({ amountCents: { lte: max } });
  if (f.q) {
    const digits = onlyDigits(f.q);
    and.push({
      OR: [
        { supplier: { contains: f.q, mode: "insensitive" } },
        { description: { contains: f.q, mode: "insensitive" } },
        { observation: { contains: f.q, mode: "insensitive" } },
        ...(digits.length >= 4 ? [{ cnpj: { contains: digits } }, { nfeKey: { contains: digits } }] : []),
      ],
    });
  }
  return { AND: and };
}

export const expenseInclude = {
  user: { select: { id: true, name: true } },
  sector: { select: { name: true } },
  category: { select: { name: true } },
  costCenter: { select: { name: true, code: true } },
  project: { select: { name: true } },
  reviewedBy: { select: { name: true } },
} satisfies Prisma.ExpenseInclude;

export function monthRange(ref = new Date()) {
  const start = new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), 1));
  const end = new Date(Date.UTC(ref.getFullYear(), ref.getMonth() + 1, 0));
  return { start, end };
}

export const PAYMENT_LABEL = { CREDITO: "Crédito", DEBITO: "Débito", OUTRO: "Outro" } as const;
export const STATUS_LABEL = { LANCADA: "Lançada", REVISADA: "Revisada" } as const;

export const ymd = (d: Date) => d.toISOString().slice(0, 10);
export const brDate = (d: Date) => d.toISOString().slice(0, 10).split("-").reverse().join("/");
