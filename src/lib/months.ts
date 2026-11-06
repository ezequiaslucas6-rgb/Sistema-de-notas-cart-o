import "server-only";
import { db } from "./db";

export const yearMonth = (d: Date) => d.toISOString().slice(0, 7);
export const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
};

export async function closedAmong(dates: Date[]): Promise<string[]> {
  const keys = [...new Set(dates.map(yearMonth))];
  if (!keys.length) return [];
  const rows = await db.closedMonth.findMany({ where: { yearMonth: { in: keys } }, select: { yearMonth: true } });
  return rows.map((r) => r.yearMonth);
}

/** Devolve mensagem de erro se algum dos dias cair em mês fechado; senão null. */
export async function closedMessage(...dates: Date[]): Promise<string | null> {
  const closed = await closedAmong(dates);
  if (!closed.length) return null;
  return `O mês de ${monthLabel(closed[0])} está fechado para lançamentos. Peça ao financeiro para reabrir.`;
}
