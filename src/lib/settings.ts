import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { companySchema, parseOrDefault, rulesSchema, securitySchema, type Company, type Rules, type Security } from "./settings-schema";

const loadAll = unstable_cache(
  async () => {
    const rows = await db.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>;
  },
  ["app-settings-v1"],
  { tags: ["settings"], revalidate: 300 },
);

export async function getRules(): Promise<Rules> {
  return parseOrDefault(rulesSchema, (await loadAll()).rules);
}
export async function getSecurity(): Promise<Security> {
  return parseOrDefault(securitySchema, (await loadAll()).security);
}
export async function getCompany(): Promise<Company> {
  return parseOrDefault(companySchema, (await loadAll()).company);
}

export async function saveSetting(key: "rules" | "security" | "company", value: Prisma.InputJsonValue, actorId: string) {
  await db.setting.upsert({ where: { key }, create: { key, value, updatedById: actorId }, update: { value, updatedById: actorId } });
  revalidateTag("settings");
}
