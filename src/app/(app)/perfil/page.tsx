import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { revealCpf } from "@/lib/users";
import { ROLE_LABEL } from "@/lib/permissions";
import { ChangePasswordForm, ContactForm } from "@/components/AdminForms";
import { PageTitle } from "@/components/Bits";

export const metadata = { title: "Meu perfil" };
export const dynamic = "force-dynamic";

export default async function Profile() {
  const me = await requireUser();
  const u = await db.user.findUniqueOrThrow({ where: { id: me.id }, include: { sector: true } });
  return (
    <>
      <PageTitle title="Meu perfil" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-1 p-5 text-sm">
          <h2 className="mb-2 font-semibold">Dados cadastrais</h2>
          <p><span className="text-slate-500">Nome:</span> {u.name}</p>
          <p><span className="text-slate-500">CPF:</span> {revealCpf(u.cpfEnc)}</p>
          <p><span className="text-slate-500">Perfil:</span> {ROLE_LABEL[u.role]}</p>
          <p><span className="text-slate-500">Setor:</span> {u.sector?.name ?? "—"}</p>
          <p><span className="text-slate-500">Política de privacidade aceita em:</span> {u.consentAt?.toLocaleDateString("pt-BR")}</p>
          <div className="mt-4 border-t border-slate-100 pt-4"><ContactForm email={u.email} phone={u.phone} /></div>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Alterar senha</h2>
          <ChangePasswordForm />
        </section>
        <section className="card p-5 text-sm lg:col-span-2">
          <h2 className="mb-2 font-semibold">Seus dados (LGPD)</h2>
          <p className="mb-3 text-slate-600">Você pode baixar uma cópia de todos os seus dados pessoais e notas lançadas. Para correção ou eliminação, procure o administrador ou o encarregado de dados da empresa.</p>
          <div className="flex flex-wrap gap-2"><a className="btn-secondary" href="/api/meus-dados">Baixar meus dados (JSON)</a><a className="btn-secondary" href="/privacidade" target="_blank">Política de privacidade</a></div>
        </section>
      </div>
    </>
  );
}
