import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { clientIp } from "./request";

type AuditInput = {
  actor?: { id: string; name: string } | null;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Prisma.InputJsonValue;
};

/** Registro de auditoria (LGPD / segurança). Nunca deve derrubar a operação principal. */
export async function audit(input: AuditInput) {
  try {
    const ip = await clientIp().catch(() => null);
    await db.auditLog.create({
      data: {
        actorId: input.actor?.id ?? null,
        actorName: input.actor?.name ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        meta: input.meta,
        ip,
      },
    });
  } catch (err) {
    console.error("[audit] falha ao registrar", err);
  }
}
