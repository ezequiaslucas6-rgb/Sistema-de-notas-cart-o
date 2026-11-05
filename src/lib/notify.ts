import "server-only";
import { db } from "./db";
import { sendEmail } from "./email";
import { env } from "./env";

type Payload = { title: string; body: string; link?: string };

/** Cria notificação no sistema e, opcionalmente, envia e-mail. Falhas não propagam. */
export async function notifyUsers(userIds: string[], p: Payload, opts: { email?: boolean } = {}) {
  const ids = [...new Set(userIds)];
  if (!ids.length) return;
  try {
    await db.notification.createMany({ data: ids.map((userId) => ({ userId, ...p })) });
    if (opts.email) {
      const users = await db.user.findMany({ where: { id: { in: ids }, active: true, email: { not: null } }, select: { email: true } });
      await Promise.all(
        users.map((u) =>
          sendEmail({
            to: u.email!,
            subject: p.title,
            text: `${p.body}${p.link ? `\n\n${env.appUrl}${p.link}` : ""}`,
          }),
        ),
      );
    }
  } catch (err) {
    console.error("[notify] falha", err);
  }
}
