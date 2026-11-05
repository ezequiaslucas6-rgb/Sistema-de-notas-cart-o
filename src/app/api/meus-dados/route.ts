import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { revealCpf } from "@/lib/users";

export const dynamic = "force-dynamic";

/** LGPD art. 18 – portabilidade/acesso: o titular baixa seus próprios dados. */
export async function GET() {
  const u = await getSessionUser();
  if (!u) return new NextResponse("Não autenticado", { status: 401 });
  const [me, expenses, logs] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: u.id }, include: { sector: true } }),
    db.expense.findMany({ where: { userId: u.id, deletedAt: null }, include: { category: true, comments: true, attachments: { select: { filename: true, mime: true, size: true } } }, orderBy: { date: "desc" } }),
    db.auditLog.findMany({ where: { actorId: u.id }, orderBy: { createdAt: "desc" }, take: 500, select: { action: true, createdAt: true, ip: true } }),
  ]);
  await audit({ actor: u, action: "lgpd.exportou_proprios_dados" });
  const body = {
    geradoEm: new Date().toISOString(),
    titular: { nome: me.name, cpf: revealCpf(me.cpfEnc), email: me.email, telefone: me.phone, perfil: me.role, setor: me.sector?.name ?? null, criadoEm: me.createdAt, aceitePoliticaEm: me.consentAt },
    notas: expenses.map((e) => ({ id: e.id, data: e.date, valor: e.amountCents / 100, fornecedor: e.supplier, categoria: e.category.name, descricao: e.description, observacao: e.observation, status: e.status, comentarios: e.comments.map((c) => ({ texto: c.text, em: c.createdAt })), anexos: e.attachments })),
    registrosDeAcesso: logs,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="meus-dados.json"', "Cache-Control": "no-store" },
  });
}
