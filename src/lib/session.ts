import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { randomToken, sha256 } from "./crypto";
import { clientIp, userAgent } from "./request";
import { env } from "./env";
import type { Actor } from "./permissions";
import { getSecurity } from "./settings";

const COOKIE = env.isProd ? "__Host-nt_session" : "nt_session";
const HOUR = 60 * 60 * 1000;
const TOUCH_MS = 5 * 60 * 1000;

export async function createSession(userId: string) {
  const sec = await getSecurity();
  const IDLE_MS = sec.sessionIdleHours * HOUR;
  const ABSOLUTE_MS = sec.sessionMaxHours * HOUR;
  const token = randomToken(32);
  const now = Date.now();
  await db.session.create({
    data: {
      id: sha256(token),
      userId,
      expiresAt: new Date(now + IDLE_MS),
      ip: await clientIp(),
      userAgent: await userAgent(),
    },
  });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ABSOLUTE_MS / 1000,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete(COOKIE);
}

export async function destroyAllSessions(userId: string, exceptId?: string) {
  await db.session.deleteMany({ where: { userId, ...(exceptId ? { NOT: { id: exceptId } } : {}) } });
}

export type SessionUser = {
  id: string;
  name: string;
  role: Role;
  sectorId: string | null;
  sectorName: string | null;
  email: string | null;
  mustChangePassword: boolean;
  consentAt: Date | null;
  sessionId: string;
};

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const sec = await getSecurity();
  const IDLE_MS = sec.sessionIdleHours * HOUR;
  const ABSOLUTE_MS = sec.sessionMaxHours * HOUR;
  const sid = sha256(token);
  const s = await db.session.findUnique({
    where: { id: sid },
    include: { user: { include: { sector: true } } },
  });
  if (!s) return null;
  const now = Date.now();
  const u = s.user;
  if (s.expiresAt.getTime() < now || s.createdAt.getTime() + ABSOLUTE_MS < now || !u.active || u.anonymizedAt) {
    await db.session.deleteMany({ where: { id: sid } });
    return null;
  }
  if (now - s.lastSeenAt.getTime() > TOUCH_MS) {
    await db.session.update({ where: { id: sid }, data: { lastSeenAt: new Date(now), expiresAt: new Date(now + IDLE_MS) } });
  }
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    sectorId: u.sectorId,
    sectorName: u.sector?.name ?? null,
    email: u.email,
    mustChangePassword: u.mustChangePassword,
    consentAt: u.consentAt,
    sessionId: sid,
  };
});

/** Exige login. Quem ainda não trocou a senha / aceitou os termos é enviado ao primeiro acesso. */
export async function requireUser(opts: { allowIncomplete?: boolean } = {}): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  if (!opts.allowIncomplete && (u.mustChangePassword || !u.consentAt)) redirect("/primeiro-acesso");
  return u;
}

export async function requireRole(check: (a: Actor) => boolean): Promise<SessionUser> {
  const u = await requireUser();
  if (!check(u)) redirect("/painel?erro=permissao");
  return u;
}

export const toActor = (u: SessionUser): Actor => ({ id: u.id, role: u.role, sectorId: u.sectorId });
