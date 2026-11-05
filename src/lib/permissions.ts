import type { Role } from "@prisma/client";

export type Actor = { id: string; role: Role; sectorId: string | null };

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  FINANCEIRO: "Financeiro",
  GESTOR: "Gestor de setor",
  USUARIO: "Colaborador",
};

export const isAdmin = (a: Actor) => a.role === "ADMIN";
export const isFinance = (a: Actor) => a.role === "FINANCEIRO" || a.role === "ADMIN";
export const canSeeAll = (a: Actor) => isFinance(a);
export const canManageUsers = (a: Actor) => a.role === "ADMIN" || a.role === "FINANCEIRO" || a.role === "GESTOR";
export const canManageCatalogs = (a: Actor) => isFinance(a);
export const canReview = (a: Actor) => isFinance(a);
export const canEditExpense = (a: Actor) => isFinance(a);
export const canDeleteExpense = (a: Actor) => isAdmin(a);
export const canSeeAudit = (a: Actor) => isFinance(a);
export const canManageIntegrations = (a: Actor) => isAdmin(a);
export const canExport = (a: Actor) => a.role !== "USUARIO";

/**
 * Filtro Prisma que restringe quais notas o ator pode enxergar.
 * ADMIN/FINANCEIRO: todas · GESTOR: as do seu setor (e as próprias) · USUARIO: só as próprias.
 */
export function expenseScope(a: Actor) {
  if (canSeeAll(a)) return { deletedAt: null };
  if (a.role === "GESTOR" && a.sectorId) {
    return { deletedAt: null, OR: [{ sectorId: a.sectorId }, { userId: a.id }] };
  }
  return { deletedAt: null, userId: a.id };
}

export function canViewExpense(a: Actor, e: { userId: string; sectorId: string | null }) {
  if (canSeeAll(a)) return true;
  if (e.userId === a.id) return true;
  return a.role === "GESTOR" && !!a.sectorId && e.sectorId === a.sectorId;
}

/** Perfis que o ator pode atribuir ao criar/editar um usuário. */
export function assignableRoles(a: Actor): Role[] {
  if (a.role === "ADMIN") return ["ADMIN", "FINANCEIRO", "GESTOR", "USUARIO"];
  if (a.role === "FINANCEIRO") return ["GESTOR", "USUARIO"];
  if (a.role === "GESTOR") return ["USUARIO"];
  return [];
}

/** O ator pode administrar (editar/redefinir/desativar) este usuário-alvo? */
export function canAdminUser(a: Actor, target: { id: string; role: Role; sectorId: string | null }) {
  if (a.role === "ADMIN") return true;
  if (target.id === a.id) return false;
  if (a.role === "FINANCEIRO") return target.role === "GESTOR" || target.role === "USUARIO";
  if (a.role === "GESTOR") return target.role === "USUARIO" && !!a.sectorId && target.sectorId === a.sectorId;
  return false;
}
