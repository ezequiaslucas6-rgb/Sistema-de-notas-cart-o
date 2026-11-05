import "server-only";
import { hash, verify } from "@node-rs/argon2";

// argon2id (algorithm: 2) com parâmetros recomendados pela OWASP.
const OPTS = { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(pw: string): Promise<string> {
  return hash(pw, OPTS);
}

export async function verifyPassword(hashed: string, pw: string): Promise<boolean> {
  try {
    return await verify(hashed, pw);
  } catch {
    return false;
  }
}

let dummy: Promise<string> | null = null;
/** Executa uma verificação "falsa" para igualar o tempo quando o usuário não existe. */
export async function fakeVerify(pw: string) {
  dummy ??= hashPassword("dummy-password-for-timing");
  await verifyPassword(await dummy, pw);
}
