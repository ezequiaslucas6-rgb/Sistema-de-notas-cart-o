import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, toActor } from "@/lib/session";
import { canViewExpense } from "@/lib/permissions";
import { getFile } from "@/lib/storage";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const u = await getSessionUser();
  if (!u || u.mustChangePassword || !u.consentAt) return new NextResponse("Não autenticado", { status: 401 });

  const att = await db.attachment.findUnique({ where: { id }, include: { expense: true } });
  if (!att) return new NextResponse("Não encontrado", { status: 404 });
  const allowed = att.expense ? !att.expense.deletedAt && canViewExpense(toActor(u), att.expense) : att.uploadedBy === u.id;
  if (!allowed) return new NextResponse("Não encontrado", { status: 404 });

  const data = await getFile(att.storageKey);
  await audit({ actor: u, action: "anexo.visualizado", entity: "Attachment", entityId: id });
  const inline = att.mime.startsWith("image/") || att.mime === "application/pdf";
  const name = encodeURIComponent(att.filename);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": att.mime,
      "Content-Length": String(data.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${name}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    },
  });
}
