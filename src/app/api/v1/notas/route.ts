import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { rateLimit } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * API somente-leitura para integrações (contabilidade/ERP/planilhas).
 * Autenticação: Authorization: Bearer nt_xxx  (tokens criados em /integracoes)
 * Filtros: ?de=YYYY-MM-DD&ate=YYYY-MM-DD&status=LANCADA|REVISADA&pagina=1 (200 por página)
 */
export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token.startsWith("nt_")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rec = await db.apiToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!rec || rec.revokedAt) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await rateLimit(`api:${rec.id}`, 120, 60)).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  await db.apiToken.update({ where: { id: rec.id }, data: { lastUsedAt: new Date() } });

  const sp = new URL(req.url).searchParams;
  const ok = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T00:00:00Z") : undefined);
  const status = sp.get("status");
  const page = Math.max(1, Number(sp.get("pagina") ?? 1) || 1);
  const where: Prisma.ExpenseWhereInput = {
    deletedAt: null,
    date: { gte: ok(sp.get("de")), lte: ok(sp.get("ate")) },
    ...(status === "LANCADA" || status === "REVISADA" ? { status } : {}),
  };
  const [total, rows] = await Promise.all([
    db.expense.count({ where }),
    db.expense.findMany({
      where,
      orderBy: [{ date: "desc" }, { id: "asc" }],
      skip: (page - 1) * 200,
      take: 200,
      include: { user: { select: { name: true } }, sector: { select: { name: true } }, category: { select: { name: true } }, costCenter: { select: { name: true, code: true } }, project: { select: { name: true } } },
    }),
  ]);
  await audit({ action: "api.notas.consultadas", entity: "ApiToken", entityId: rec.id, meta: { pagina: page } });
  return NextResponse.json({
    total,
    pagina: page,
    notas: rows.map((r) => ({
      id: r.id,
      data: r.date.toISOString().slice(0, 10),
      valor: r.amountCents / 100,
      fornecedor: r.supplier,
      cnpj: r.cnpj,
      chaveNfe: r.nfeKey,
      categoria: r.category.name,
      centroCusto: r.costCenter?.name ?? null,
      projeto: r.project?.name ?? null,
      setor: r.sector?.name ?? null,
      colaborador: r.user.name,
      formaPagamento: r.paymentMethod,
      cartaoFinal: r.cardLast4,
      descricao: r.description,
      observacao: r.observation,
      status: r.status,
    })),
  });
}
