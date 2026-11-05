import { db } from "@/lib/db";
import { requireRole, toActor } from "@/lib/session";
import { assignableRoles, canManageUsers } from "@/lib/permissions";
import { CreateUserForm } from "@/components/AdminForms";
import { PageTitle } from "@/components/Bits";

export const metadata = { title: "Novo usuário" };

export default async function NewUser() {
  const me = await requireRole(canManageUsers);
  const a = toActor(me);
  const sectors = await db.sector.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <PageTitle title="Novo usuário" />
      <div className="max-w-2xl"><CreateUserForm roles={assignableRoles(a)} sectors={sectors} lockedSectorId={a.role === "GESTOR" ? a.sectorId : null} /></div>
    </>
  );
}
