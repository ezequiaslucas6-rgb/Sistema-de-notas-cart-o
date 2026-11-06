import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getSessionUser, toActor } from "@/lib/session";
import { canExport } from "@/lib/permissions";
import { buildWhere, readFilters, type SP } from "@/lib/expenses";
import { toCsv, toPdf, toXlsx } from "@/lib/export";
import { rateLimit } from "@/lib/ratelimit";
import { getCompany } from "@/lib/settings";

export const dynamic = "force-dynamic";
const MAX_ROWS = 20_000;

export async function GET(req: Request) {
  const u = await getSessionUser();
  if (!u || u.mustChangePassword || !u.consentAt) return new NextResponse("Não autenticado", { status: 401 });
  const actor = toActor(u);
  if (!canExport(actor)) return new NextResponse("Sem permissão", { status: 403 });
  if (!(await rateLimit(`export:${u.id}`, 20, 10 * 60)).ok) return new NextResponse("Muitas exportações. Aguarde.", { status: 429 });

  const url = new URL(req.url);
  const sp: SP = Object.fromEntries(url.searchParams.entries());
  const fmt = url.searchParams.get("formato") ?? "xlsx";
  const rows = await db.expense.findMany({
    where: buildWhere(actor, readFilters(sp)),
    include: { user: { select: { name: true } }, sector: { select: { name: true } }, category: { select: { name: true } }, costCenter: { select: { name: true } }, project: { select: { name: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: MAX_ROWS,
  });
  await audit({ actor: u, action: "relatorio.exportado", meta: { formato: fmt, linhas: rows.length } });

  const stamp = new Date().toISOString().slice(0, 10);
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (fmt === "csv") {
    return new NextResponse(toCsv(rows), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="notas-${stamp}.csv"` } });
  }
  if (fmt === "pdf") {
    const company = await getCompany();
    const pdf = await toPdf(rows, `${company.tradeName} – Notas do cartão corporativo – ${stamp}`);
    return new NextResponse(Buffer.from(pdf), { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="notas-${stamp}.pdf"` } });
  }
  const xlsx = await toXlsx(rows);
  return new NextResponse(new Uint8Array(xlsx), {
    headers: { ...headers, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="notas-${stamp}.xlsx"` },
  });
}
