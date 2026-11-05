"use server";

import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { cpfHash, encrypt, randomToken, sha256 } from "@/lib/crypto";
import { requireUser, destroyAllSessions, toActor } from "@/lib/session";
import { assignableRoles, canAdminUser, canManageCatalogs, canManageIntegrations, canManageUsers, isAdmin } from "@/lib/permissions";
import { FormState, optStr, str } from "@/lib/form";
import { createUser, generateTempPassword, UserInputError } from "@/lib/users";
import { hashPassword } from "@/lib/password";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { normalizeEmail, normalizePhone } from "@/lib/validators";

const ROLES: Role[] = ["ADMIN", "FINANCEIRO", "GESTOR", "USUARIO"];

async function welcomeEmail(email: string | null, name: string, tempPassword: string) {
  if (!email) return;
  await sendEmail({
    to: email,
    subject: "Seu acesso ao Nortetel Notas",
    text: `Olá, ${name.split(" ")[0]}.\n\nSeu acesso foi criado.\nEndereço: ${env.appUrl}\nLogin: seu CPF, e-mail ou telefone\nSenha temporária: ${tempPassword}\n\nNo primeiro acesso você deverá criar uma nova senha.`,
  });
}

export async function createUserAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser();
  const actor = toActor(me);
  if (!canManageUsers(actor)) return { error: "Sem permissão." };
  const role = str(fd, "role") as Role;
  if (!ROLES.includes(role) || !assignableRoles(actor).includes(role)) return { error: "Perfil não permitido para você." };
  const sectorId = actor.role === "GESTOR" ? actor.sectorId : optStr(fd, "sectorId");
  if (role === "USUARIO" && !sectorId) return { error: "Informe o setor do colaborador." };
  const name = str(fd, "name");
  if (name.length < 3) return { error: "Informe o nome completo." };
  const temp = generateTempPassword();
  try {
    const user = await createUser({ name, cpf: str(fd, "cpf"), email: optStr(fd, "email"), phone: optStr(fd, "phone"), password: temp, role, sectorId });
    await audit({ actor: me, action: "usuario.criado", entity: "User", entityId: user.id, meta: { perfil: role } });
    await welcomeEmail(user.email, name, temp);
    revalidatePath("/usuarios");
    return { ok: `Usuário criado. Senha temporária (mostrada só agora): ${temp}` };
  } catch (e) {
    if (e instanceof UserInputError) return { error: e.message };
    throw e;
  }
}

export async function updateUserAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser();
  const actor = toActor(me);
  const target = await db.user.findUnique({ where: { id: str(fd, "id") } });
  if (!target || target.anonymizedAt || !canAdminUser(actor, target)) return { error: "Sem permissão." };

  const role = str(fd, "role") as Role;
  if (!ROLES.includes(role) || (role !== target.role && !assignableRoles(actor).includes(role))) return { error: "Perfil não permitido." };
  const sectorId = actor.role === "GESTOR" ? target.sectorId : optStr(fd, "sectorId");
  const email = optStr(fd, "email") ? normalizeEmail(str(fd, "email")) : null;
  const phoneRaw = optStr(fd, "phone");
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { error: "Telefone inválido." };
  if (!email && !phone) return { error: "Informe e-mail ou telefone." };
  const name = str(fd, "name");
  if (name.length < 3) return { error: "Informe o nome completo." };
  const active = fd.get("active") === "on";
  if (target.id === me.id && !active) return { error: "Você não pode desativar a si mesmo." };

  const clash = await db.user.findFirst({ where: { id: { not: target.id }, OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] } });
  if (clash) return { error: "E-mail ou telefone já usado por outro usuário." };

  await db.user.update({ where: { id: target.id }, data: { name, email, phone, role, sectorId, active } });
  if (!active || role !== target.role) await destroyAllSessions(target.id);
  await audit({ actor: me, action: "usuario.editado", entity: "User", entityId: target.id, meta: { perfilAntes: target.role, perfilDepois: role, ativo: active } });
  revalidatePath("/usuarios");
  return { ok: "Usuário atualizado." };
}

export async function resetUserPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser();
  const target = await db.user.findUnique({ where: { id: str(fd, "id") } });
  if (!target || target.anonymizedAt || !canAdminUser(toActor(me), target)) return { error: "Sem permissão." };
  const temp = generateTempPassword();
  await db.user.update({ where: { id: target.id }, data: { passwordHash: await hashPassword(temp), mustChangePassword: true, failedLogins: 0, lockedUntil: null } });
  await destroyAllSessions(target.id);
  await audit({ actor: me, action: "usuario.senha_redefinida", entity: "User", entityId: target.id });
  await welcomeEmail(target.email, target.name, temp);
  return { ok: `Nova senha temporária (mostrada só agora): ${temp}` };
}

/** LGPD – eliminação/anonimização dos dados pessoais. As notas são mantidas (obrigação fiscal). */
export async function anonymizeUserAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser();
  if (!isAdmin(toActor(me))) return { error: "Somente administradores." };
  const target = await db.user.findUnique({ where: { id: str(fd, "id") } });
  if (!target || target.id === me.id) return { error: "Operação não permitida." };
  if (str(fd, "confirm") !== "ANONIMIZAR") return { error: 'Digite "ANONIMIZAR" para confirmar.' };
  const fake = randomToken(16);
  await db.user.update({
    where: { id: target.id },
    data: {
      name: "Usuário removido",
      email: null,
      phone: null,
      cpfHash: cpfHash(fake),
      cpfEnc: encrypt("00000000000"),
      cpfLast2: "00",
      passwordHash: await hashPassword(randomToken(24)),
      active: false,
      anonymizedAt: new Date(),
    },
  });
  await destroyAllSessions(target.id);
  await db.notification.deleteMany({ where: { userId: target.id } });
  await audit({ actor: me, action: "usuario.anonimizado", entity: "User", entityId: target.id });
  revalidatePath("/usuarios");
  return { ok: "Dados pessoais anonimizados." };
}

type Kind = "sector" | "category" | "costCenter" | "project";

export async function saveCatalogAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser();
  if (!canManageCatalogs(toActor(me))) return { error: "Sem permissão." };
  const kind = str(fd, "kind") as Kind;
  const name = str(fd, "name");
  const code = optStr(fd, "code");
  if (name.length < 2 || name.length > 80) return { error: "Informe um nome (2 a 80 caracteres)." };
  try {
    if (kind === "sector") await db.sector.create({ data: { name } });
    else if (kind === "category") await db.category.create({ data: { name } });
    else if (kind === "costCenter") await db.costCenter.create({ data: { name, code } });
    else if (kind === "project") await db.project.create({ data: { name } });
    else return { error: "Tipo inválido." };
  } catch {
    return { error: "Já existe um item com esse nome." };
  }
  await audit({ actor: me, action: "cadastro.criado", entity: kind, meta: { nome: name } });
  revalidatePath("/cadastros");
  return { ok: "Cadastro adicionado." };
}

export async function toggleCatalogAction(fd: FormData) {
  const me = await requireUser();
  if (!canManageCatalogs(toActor(me))) return;
  const kind = str(fd, "kind") as Kind;
  const id = str(fd, "id");
  const active = fd.get("active") === "1";
  const data = { active };
  if (kind === "sector") await db.sector.update({ where: { id }, data });
  else if (kind === "category") await db.category.update({ where: { id }, data });
  else if (kind === "costCenter") await db.costCenter.update({ where: { id }, data });
  else if (kind === "project") await db.project.update({ where: { id }, data });
  await audit({ actor: me, action: active ? "cadastro.ativado" : "cadastro.desativado", entity: kind, entityId: id });
  revalidatePath("/cadastros");
}

export async function createApiTokenAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser();
  if (!canManageIntegrations(toActor(me))) return { error: "Somente administradores." };
  const name = str(fd, "name");
  if (name.length < 3) return { error: "Dê um nome ao token (ex.: Contabilidade)." };
  const token = `nt_${randomToken(32)}`;
  await db.apiToken.create({ data: { name, tokenHash: sha256(token), prefix: token.slice(0, 7), createdById: me.id } });
  await audit({ actor: me, action: "api_token.criado", meta: { nome: name } });
  revalidatePath("/integracoes");
  return { ok: `Token criado (copie agora, não será exibido novamente): ${token}` };
}

export async function revokeApiTokenAction(fd: FormData) {
  const me = await requireUser();
  if (!canManageIntegrations(toActor(me))) return;
  await db.apiToken.update({ where: { id: str(fd, "id") }, data: { revokedAt: new Date() } });
  await audit({ actor: me, action: "api_token.revogado", entityId: str(fd, "id") });
  revalidatePath("/integracoes");
}

export async function updateContactAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser();
  const email = optStr(fd, "email") ? normalizeEmail(str(fd, "email")) : null;
  const phoneRaw = optStr(fd, "phone");
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { error: "Telefone inválido." };
  if (!email && !phone) return { error: "Mantenha ao menos e-mail ou telefone." };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "E-mail inválido." };
  const clash = await db.user.findFirst({ where: { id: { not: me.id }, OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] } });
  if (clash) return { error: "E-mail ou telefone já usado por outro usuário." };
  await db.user.update({ where: { id: me.id }, data: { email, phone } });
  await audit({ actor: me, action: "perfil.contato_alterado" });
  revalidatePath("/perfil");
  return { ok: "Contatos atualizados." };
}

export async function markNotificationsReadAction() {
  const me = await requireUser();
  await db.notification.updateMany({ where: { userId: me.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/notificacoes");
}

