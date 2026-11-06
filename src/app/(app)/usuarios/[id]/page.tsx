import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, toActor } from "@/lib/session";
import { assignableRoles, canAdminUser, canManageUsers, isAdmin, ROLE_LABEL } from "@/lib/permissions";
import { revealCpf } from "@/lib/users";
import { audit } from "@/lib/audit";
import { AnonymizeForm, EditUserForm, ResetPasswordForm } from "@/components/AdminForms";
import { PageTitle } from "@/components/Bits";

export const metadata = { title: "Usuário" };
export const dynamic = "force-dynamic";

export default async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole(canManageUsers);
  const a = toActor(me);
  const { id } = await params;
  const u = await db.user.findUnique({ where: { id } });
  if (!u) notFound();
  if (u.id === me.id) redirect("/perfil");
  if (!canAdminUser(a, u)) notFound();
  const sectors = await db.sector.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  const cpf = u.anonymizedAt ? "—" : revealCpf(u.cpfEnc);
  if (!u.anonymizedAt) await audit({ actor: me, action: "usuario.cpf_visualizado", entity: "User", entityId: u.id });
  return (
    <>
      <PageTitle title={u.name} subtitle={`CPF ${cpf} · ${ROLE_LABEL[u.role]} · último acesso ${u.lastLoginAt ? u.lastLoginAt.toLocaleString("pt-BR", { timeZone: "America/Porto_Velho" }) : "nunca"}`} />
      {u.anonymizedAt ? (
        <p className="card p-5 text-sm">Dados pessoais anonimizados em {u.anonymizedAt.toLocaleDateString("pt-BR")}.</p>
      ) : (
        <div className="grid max-w-2xl gap-6">
          <EditUserForm u={u} roles={assignableRoles(a)} sectors={sectors} lockedSector={a.role === "GESTOR"} self={false} />
          <ResetPasswordForm id={u.id} />
          {isAdmin(a) && <AnonymizeForm id={u.id} />}
        </div>
      )}
    </>
  );
}
