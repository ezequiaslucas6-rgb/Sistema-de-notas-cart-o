"use server";

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { cpfHash, randomToken, sha256 } from "@/lib/crypto";
import { fakeVerify, hashPassword, verifyPassword } from "@/lib/password";
import { clearRateLimit, rateLimit } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { createSession, destroyAllSessions, destroySession, requireUser } from "@/lib/session";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { FormState, str } from "@/lib/form";
import { checkPassword, isValidCpf, normalizeEmail, normalizePhone, onlyDigits } from "@/lib/validators";

const MAX_FAILS = 5;
const LOCK_MIN = 15;

function identityFilters(identifier: string): Prisma.UserWhereInput[] {
  const id = identifier.trim();
  if (id.includes("@")) return [{ email: normalizeEmail(id) }];
  const digits = onlyDigits(id);
  const or: Prisma.UserWhereInput[] = [];
  if (digits.length === 11 && isValidCpf(digits)) or.push({ cpfHash: cpfHash(digits) });
  const phone = normalizePhone(digits);
  if (phone) or.push({ phone });
  return or;
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const identifier = str(fd, "identifier");
  const password = String(fd.get("password") ?? "");
  if (!identifier || !password) return { error: "Informe seu CPF, e-mail ou telefone e a senha." };

  const ip = await clientIp();
  const idKey = sha256(identifier.toLowerCase().replace(/\D/g, "") || identifier.toLowerCase());
  const [byIp, byId] = await Promise.all([rateLimit(`login:ip:${ip}`, 30, 15 * 60), rateLimit(`login:id:${idKey}`, 10, 15 * 60)]);
  if (!byIp.ok || !byId.ok) {
    await audit({ action: "auth.login.bloqueado_rate_limit", meta: { ip } });
    return { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };
  }

  const filters = identityFilters(identifier);
  const candidates = filters.length ? await db.user.findMany({ where: { OR: filters, active: true, anonymizedAt: null } }) : [];

  if (!candidates.length) {
    await fakeVerify(password);
    await audit({ action: "auth.login.falha", meta: { motivo: "usuario_inexistente" } });
    return { error: "Credenciais inválidas." };
  }

  for (const user of candidates) {
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await audit({ actor: user, action: "auth.login.conta_bloqueada" });
      return { error: "Conta temporariamente bloqueada por excesso de tentativas. Tente novamente mais tarde." };
    }
    if (await verifyPassword(user.passwordHash, password)) {
      await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
      await clearRateLimit(`login:id:${idKey}`);
      await createSession(user.id);
      await audit({ actor: user, action: "auth.login.sucesso" });
      redirect("/painel");
    }
  }

  for (const user of candidates) {
    const fails = user.failedLogins + 1;
    await db.user.update({
      where: { id: user.id },
      data: { failedLogins: fails, lockedUntil: fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MIN * 60_000) : user.lockedUntil },
    });
    await audit({ actor: user, action: "auth.login.falha", meta: { tentativas: fails } });
  }
  return { error: "Credenciais inválidas." };
}

export async function logoutAction() {
  const u = await requireUser({ allowIncomplete: true });
  await audit({ actor: u, action: "auth.logout" });
  await destroySession();
  redirect("/login");
}

/** Primeiro acesso: define nova senha e registra o aceite da política de privacidade (LGPD). */
export async function firstAccessAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser({ allowIncomplete: true });
  const pw = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const accepted = fd.get("accept") === "on";
  const row = await db.user.findUniqueOrThrow({ where: { id: u.id } });

  if (!row.consentAt && !accepted) return { error: "É necessário aceitar a Política de Privacidade para continuar." };
  if (pw !== confirm) return { error: "As senhas não conferem." };
  const check = checkPassword(pw, [row.name.split(" ")[0], row.email?.split("@")[0] ?? ""]);
  if (!check.ok) return { error: `Senha fraca. Requisitos: ${check.problems.join(", ")}.` };
  if (await verifyPassword(row.passwordHash, pw)) return { error: "A nova senha deve ser diferente da senha temporária." };

  await db.user.update({
    where: { id: u.id },
    data: { passwordHash: await hashPassword(pw), mustChangePassword: false, consentAt: row.consentAt ?? new Date() },
  });
  await destroyAllSessions(u.id, u.sessionId);
  await audit({ actor: u, action: "auth.primeiro_acesso.concluido" });
  redirect("/painel");
}

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const current = String(fd.get("current") ?? "");
  const pw = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const lim = await rateLimit(`chgpw:${u.id}`, 8, 15 * 60);
  if (!lim.ok) return { error: "Muitas tentativas. Aguarde alguns minutos." };
  const row = await db.user.findUniqueOrThrow({ where: { id: u.id } });
  if (!(await verifyPassword(row.passwordHash, current))) return { error: "Senha atual incorreta." };
  if (pw !== confirm) return { error: "As senhas não conferem." };
  const check = checkPassword(pw, [row.name.split(" ")[0], row.email?.split("@")[0] ?? ""]);
  if (!check.ok) return { error: `Senha fraca. Requisitos: ${check.problems.join(", ")}.` };
  await db.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(pw) } });
  await destroyAllSessions(u.id, u.sessionId);
  await audit({ actor: u, action: "auth.senha.alterada" });
  return { ok: "Senha alterada. Outras sessões foram encerradas." };
}

const GENERIC_RESET_MSG = "Se houver um cadastro com e-mail para esses dados, enviaremos um link de redefinição. Caso contrário, procure o financeiro ou o administrador.";

export async function requestResetAction(_: FormState, fd: FormData): Promise<FormState> {
  const identifier = str(fd, "identifier");
  if (!identifier) return { error: "Informe seu CPF, e-mail ou telefone." };
  const ip = await clientIp();
  const lim = await rateLimit(`reset:ip:${ip}`, 5, 60 * 60);
  if (!lim.ok) return { error: "Muitas solicitações. Tente novamente mais tarde." };

  const filters = identityFilters(identifier);
  const user = filters.length ? await db.user.findFirst({ where: { OR: filters, active: true, anonymizedAt: null, email: { not: null } } }) : null;
  if (user?.email) {
    const token = randomToken(32);
    await db.passwordResetToken.create({ data: { id: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + 60 * 60_000) } });
    await sendEmail({
      to: user.email,
      subject: "Redefinição de senha – Nortetel Notas",
      text: `Olá, ${user.name.split(" ")[0]}.\n\nPara criar uma nova senha acesse (válido por 1 hora):\n${env.appUrl}/redefinir-senha/${token}\n\nSe você não pediu, ignore este e-mail.`,
    });
    await audit({ actor: user, action: "auth.reset.solicitado" });
  }
  return { ok: GENERIC_RESET_MSG };
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd, "token");
  const pw = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (pw !== confirm) return { error: "As senhas não conferem." };
  const rec = await db.passwordResetToken.findUnique({ where: { id: sha256(token) }, include: { user: true } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date() || !rec.user.active) return { error: "Link inválido ou expirado. Solicite um novo." };
  const check = checkPassword(pw, [rec.user.name.split(" ")[0], rec.user.email?.split("@")[0] ?? ""]);
  if (!check.ok) return { error: `Senha fraca. Requisitos: ${check.problems.join(", ")}.` };
  await db.$transaction([
    db.user.update({ where: { id: rec.userId }, data: { passwordHash: await hashPassword(pw), mustChangePassword: false, failedLogins: 0, lockedUntil: null } }),
    db.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
  ]);
  await destroyAllSessions(rec.userId);
  await audit({ actor: rec.user, action: "auth.reset.concluido" });
  redirect("/login?redefinida=1");
}
