import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { getSessionUser } from "@/lib/session";
import { LoginForm } from "./form";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redefinida?: string }> }) {
  if (await getSessionUser()) redirect("/painel");
  const sp = await searchParams;
  return (
    <AuthShell title="Entrar" subtitle="Use seu CPF, e-mail ou telefone.">
      {sp.redefinida && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Senha redefinida. Entre com a nova senha.</div>}
      <LoginForm />
      <div className="mt-4 text-center text-sm">
        <Link href="/esqueci-senha" className="text-brand-600 hover:underline">Esqueci minha senha</Link>
      </div>
    </AuthShell>
  );
}
