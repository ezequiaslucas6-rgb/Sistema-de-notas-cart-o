import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole, toActor } from "@/lib/session";
import { canManageUsers, ROLE_LABEL, canAdminUser } from "@/lib/permissions";
import { maskCpf } from "@/lib/users";
import { formatPhone } from "@/lib/validators";
import { PageTitle } from "@/components/Bits";

export const metadata = { title: "Usuários" };
export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireRole(canManageUsers);
  const a = toActor(me);
  const { q } = await searchParams;
  const users = await db.user.findMany({
    where: {
      ...(a.role === "GESTOR" ? { sectorId: a.sectorId } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { sector: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    take: 300,
  });
  return (
    <>
      <PageTitle title="Usuários"><Link href="/usuarios/novo" className="btn-primary">+ Novo usuário</Link></PageTitle>
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder="Buscar por nome ou e-mail" className="input max-w-sm" /><button className="btn-secondary">Buscar</button></form>
      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50"><tr><th className="th">Nome</th><th className="th hidden md:table-cell">CPF</th><th className="th hidden md:table-cell">Contato</th><th className="th">Perfil</th><th className="th hidden sm:table-cell">Setor</th><th className="th">Situação</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="td font-medium">{canAdminUser(a, u) || u.id === me.id ? <Link href={`/usuarios/${u.id}`} className="text-brand-700 hover:underline">{u.name}</Link> : u.name}</td>
                <td className="td hidden font-mono text-xs md:table-cell">{maskCpf(u.cpfLast2)}</td>
                <td className="td hidden text-xs md:table-cell">{u.email}<br />{u.phone && formatPhone(u.phone)}</td>
                <td className="td">{ROLE_LABEL[u.role]}</td>
                <td className="td hidden sm:table-cell">{u.sector?.name ?? "—"}</td>
                <td className="td">{u.anonymizedAt ? <span className="badge bg-slate-200 text-slate-600">Anonimizado</span> : u.active ? <span className="badge bg-emerald-100 text-emerald-800">Ativo</span> : <span className="badge bg-red-100 text-red-800">Inativo</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
