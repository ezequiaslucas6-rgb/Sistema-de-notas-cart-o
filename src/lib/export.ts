import "server-only";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Prisma } from "@prisma/client";
import { PAYMENT_LABEL, STATUS_LABEL, brDate } from "./expenses";
import { formatBRL, formatCnpj } from "./validators";

export type ExportRow = Prisma.ExpenseGetPayload<{
  include: { user: { select: { name: true } }; sector: { select: { name: true } }; category: { select: { name: true } }; costCenter: { select: { name: true } }; project: { select: { name: true } } };
}>;

const HEAD = ["Data", "Colaborador", "Setor", "Fornecedor", "CNPJ", "Categoria", "Centro de custo", "Projeto", "Pagamento", "Cartão (final)", "Descrição", "Observação", "Status", "Valor (R$)"];

/** Neutraliza injeção de fórmulas em planilhas (CSV/Excel injection). */
const safe = (v: string | null | undefined) => {
  const s = v ?? "";
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};

function toCells(r: ExportRow) {
  return [
    brDate(r.date),
    safe(r.user.name),
    safe(r.sector?.name),
    safe(r.supplier),
    r.cnpj ? formatCnpj(r.cnpj) : "",
    safe(r.category.name),
    safe(r.costCenter?.name),
    safe(r.project?.name),
    PAYMENT_LABEL[r.paymentMethod],
    r.cardLast4 ?? "",
    safe(r.description),
    safe(r.observation),
    STATUS_LABEL[r.status],
  ];
}

export function toCsv(rows: ExportRow[]): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [HEAD.map(esc).join(";")];
  for (const r of rows) lines.push([...toCells(r).map(esc), (r.amountCents / 100).toFixed(2).replace(".", ",")].join(";"));
  return "﻿" + lines.join("\r\n");
}

export async function toXlsx(rows: ExportRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Nortetel Notas";
  const ws = wb.addWorksheet("Notas");
  ws.addRow(HEAD).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  for (const r of rows) ws.addRow([...toCells(r), r.amountCents / 100]);
  ws.getColumn(HEAD.length).numFmt = '"R$" #,##0.00';
  ws.columns.forEach((c, i) => (c.width = [11, 22, 16, 28, 20, 18, 18, 16, 11, 10, 36, 30, 10, 14][i] ?? 14));
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: HEAD.length } };
  const total = ws.addRow([...Array(HEAD.length - 2).fill(""), "TOTAL", rows.reduce((s, r) => s + r.amountCents, 0) / 100]);
  total.font = { bold: true };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const latin = (s: string) => s.replace(/[^\x20-\x7E -ÿ]/g, "?");

export async function toPdf(rows: ExportRow[], title: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 842, H = 595, M = 28; // A4 paisagem
  const cols = [
    { h: "Data", w: 52 }, { h: "Colaborador", w: 110 }, { h: "Fornecedor", w: 150 }, { h: "Categoria", w: 90 },
    { h: "Setor", w: 80 }, { h: "Status", w: 52 }, { h: "Descricao", w: 170 }, { h: "Valor", w: 70 },
  ];
  let page = pdf.addPage([W, H]);
  let y = H - M;
  const cut = (t: string, w: number, size: number, f = font) => {
    let s = latin(t);
    while (s.length > 1 && f.widthOfTextAtSize(s, size) > w - 4) s = s.slice(0, -1);
    return s;
  };
  const header = () => {
    page.drawText(latin(title), { x: M, y, size: 13, font: bold, color: rgb(0.1, 0.2, 0.35) });
    y -= 18;
    let x = M;
    for (const c of cols) { page.drawText(c.h, { x, y, size: 8, font: bold }); x += c.w; }
    y -= 4;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: rgb(0.6, 0.6, 0.6) });
    y -= 11;
  };
  header();
  for (const r of rows) {
    if (y < M + 30) { page = pdf.addPage([W, H]); y = H - M; header(); }
    const vals = [brDate(r.date), r.user.name, r.supplier, r.category.name, r.sector?.name ?? "", STATUS_LABEL[r.status], r.description, formatBRL(r.amountCents)];
    let x = M;
    vals.forEach((v, i) => { page.drawText(cut(v, cols[i].w, 7.5), { x, y, size: 7.5, font }); x += cols[i].w; });
    y -= 11;
  }
  const total = rows.reduce((s, r) => s + r.amountCents, 0);
  if (y < M + 30) { page = pdf.addPage([W, H]); y = H - M; }
  y -= 8;
  page.drawText(`${rows.length} nota(s)  |  Total: ${formatBRL(total)}`, { x: M, y, size: 10, font: bold });
  return pdf.save();
}
