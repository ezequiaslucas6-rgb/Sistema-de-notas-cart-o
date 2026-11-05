import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteFile } from "@/lib/storage";
import { safeEqual } from "@/lib/crypto";

export const dynamic = "force-dynamic";

/** Rotina diária (Vercel Cron): sessões vencidas, tokens expirados, anexos órfãos e limites antigos. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return new NextResponse("Não autorizado", { status: 401 });

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
  const orphans = await db.attachment.findMany({ where: { expenseId: null, createdAt: { lt: dayAgo } }, take: 500 });
  for (const o of orphans) await deleteFile(o.storageKey);
  const [s, t, a, r] = await Promise.all([
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.passwordResetToken.deleteMany({ where: { expiresAt: { lt: dayAgo } } }),
    db.attachment.deleteMany({ where: { id: { in: orphans.map((o) => o.id) } } }),
    db.rateLimit.deleteMany({ where: { windowStart: { lt: dayAgo } } }),
  ]);
  return NextResponse.json({ sessoes: s.count, tokens: t.count, anexosOrfaos: a.count, limites: r.count });
}
