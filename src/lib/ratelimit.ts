import "server-only";
import { db } from "./db";

/** Limitador simples baseado em banco (funciona em ambiente serverless). */
export async function rateLimit(key: string, max: number, windowSec: number) {
  const now = Date.now();
  const row = await db.rateLimit.findUnique({ where: { key } });
  if (!row || now - row.windowStart.getTime() > windowSec * 1000) {
    await db.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, windowStart: new Date(now) },
      update: { count: 1, windowStart: new Date(now) },
    });
    return { ok: true as const, retryAfterSec: 0 };
  }
  if (row.count >= max) {
    return { ok: false as const, retryAfterSec: Math.ceil((row.windowStart.getTime() + windowSec * 1000 - now) / 1000) };
  }
  await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return { ok: true as const, retryAfterSec: 0 };
}

export async function clearRateLimit(key: string) {
  await db.rateLimit.deleteMany({ where: { key } });
}
