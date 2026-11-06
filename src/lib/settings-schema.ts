import { z } from "zod";

/** Limite técnico (evita estouro do inteiro em centavos): R$ 10.000.000,00. */
export const ABSOLUTE_MAX_AMOUNT_CENTS = 10_000_000_00;

const cents = z.number().int().min(1).max(ABSOLUTE_MAX_AMOUNT_CENTS).nullable().default(null);

export const rulesSchema = z.object({
  requireAttachment: z.boolean().default(true),
  requireCnpj: z.boolean().default(false),
  requireCostCenter: z.boolean().default(false),
  requireProject: z.boolean().default(false),
  warnDuplicate: z.boolean().default(true),
  maxAmountCents: cents,
  maxBackdateDays: z.number().int().min(0).max(3650).nullable().default(null),
  managerCanReview: z.boolean().default(false),
  highlightAboveCents: cents,
});
export type Rules = z.infer<typeof rulesSchema>;

export const securitySchema = z.object({
  minPasswordLength: z.number().int().min(8).max(32).default(10),
  maxFailedLogins: z.number().int().min(3).max(10).default(5),
  lockMinutes: z.number().int().min(5).max(240).default(15),
  sessionIdleHours: z.number().int().min(1).max(24).default(2),
  sessionMaxHours: z.number().int().min(4).max(72).default(12),
});
export type Security = z.infer<typeof securitySchema>;

export const TIMEZONES = [
  { id: "America/Porto_Velho", label: "Porto Velho (RO) · UTC−4" },
  { id: "America/Manaus", label: "Manaus (AM) · UTC−4" },
  { id: "America/Cuiaba", label: "Cuiabá (MT) · UTC−4" },
  { id: "America/Campo_Grande", label: "Campo Grande (MS) · UTC−4" },
  { id: "America/Rio_Branco", label: "Rio Branco (AC) · UTC−5" },
  { id: "America/Sao_Paulo", label: "Brasília / São Paulo · UTC−3" },
  { id: "America/Fortaleza", label: "Fortaleza (CE) · UTC−3" },
  { id: "America/Recife", label: "Recife (PE) · UTC−3" },
  { id: "America/Bahia", label: "Salvador (BA) · UTC−3" },
  { id: "America/Belem", label: "Belém (PA) · UTC−3" },
  { id: "America/Noronha", label: "Fernando de Noronha · UTC−2" },
] as const;

export const companySchema = z.object({
  legalName: z.string().max(160).default(""),
  tradeName: z.string().max(80).default("Nortetel"),
  cnpj: z.string().max(18).default(""),
  timezone: z.string().refine((v) => TIMEZONES.some((t) => t.id === v)).default("America/Porto_Velho"),
});
export type Company = z.infer<typeof companySchema>;

/** Lê o valor salvo; se estiver ausente ou inválido, volta ao padrão. */
export function parseOrDefault<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, raw: unknown): T {
  const r = schema.safeParse(raw ?? {});
  return r.success ? r.data : schema.parse({});
}

/** Texto amigável das regras ativas (usado no formulário). */
export function backdateMinDate(today: string, days: number | null): string | undefined {
  if (days === null) return undefined;
  const d = new Date(today + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
