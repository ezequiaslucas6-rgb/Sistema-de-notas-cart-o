import "server-only";
import { randomInt } from "node:crypto";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { cpfHash, decrypt, encrypt } from "./crypto";
import { hashPassword } from "./password";
import { formatCpf, isValidCpf, normalizeEmail, normalizePhone, onlyDigits } from "./validators";

export class UserInputError extends Error {}

export type NewUser = {
  name: string;
  cpf: string;
  email?: string | null;
  phone?: string | null;
  password: string;
  role: Role;
  sectorId?: string | null;
  mustChangePassword?: boolean;
};

export const maskCpf = (last2: string) => `•••.•••.•••-${last2}`;
export const revealCpf = (enc: string) => formatCpf(decrypt(enc));

/** Cria usuário garantindo unicidade de CPF, e-mail e telefone. */
export async function createUser(input: NewUser) {
  const cpf = onlyDigits(input.cpf);
  if (!isValidCpf(cpf)) throw new UserInputError("CPF inválido.");
  const email = input.email ? normalizeEmail(input.email) : null;
  const phone = input.phone ? normalizePhone(input.phone) : null;
  if (input.phone && !phone) throw new UserInputError("Telefone inválido. Use DDD + número.");
  if (!email && !phone) throw new UserInputError("Informe ao menos e-mail ou telefone.");

  const hash = cpfHash(cpf);
  const clash = await db.user.findFirst({
    where: { OR: [{ cpfHash: hash }, ...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
    select: { cpfHash: true, email: true },
  });
  if (clash) {
    if (clash.cpfHash === hash) throw new UserInputError("Já existe um usuário com este CPF.");
    if (email && clash.email === email) throw new UserInputError("Já existe um usuário com este e-mail.");
    throw new UserInputError("Já existe um usuário com este telefone.");
  }

  return db.user.create({
    data: {
      name: input.name.trim(),
      cpfHash: hash,
      cpfEnc: encrypt(cpf),
      cpfLast2: cpf.slice(-2),
      email,
      phone,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      sectorId: input.sectorId || null,
      mustChangePassword: input.mustChangePassword ?? true,
    },
  });
}

/** Gera senha temporária forte (atende à política de senhas). */
export function generateTempPassword(): string {
  const pick = (chars: string) => chars[randomInt(chars.length)];
  const pool = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const parts = [pick("ABCDEFGHJKLMNPQRSTUVWXYZ"), pick("abcdefghijkmnpqrstuvwxyz"), pick("23456789"), pick("@#$%&*!?")];
  while (parts.length < 14) parts.push(pick(pool));
  for (let i = parts.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }
  return parts.join("");
}
