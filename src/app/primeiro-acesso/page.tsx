import { AuthShell } from "@/components/AuthShell";
import { requireUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { FirstAccessForm } from "./form";

export const metadata = { title: "Primeiro acesso" };

export default async function FirstAccessPage() {
  const u = await requireUser({ allowIncomplete: true });
  if (!u.mustChangePassword && u.consentAt) redirect("/painel");
  return (
    <AuthShell title={`Bem-vindo(a), ${u.name.split(" ")[0]}`} subtitle="Crie sua senha pessoal e aceite a política de privacidade para continuar.">
      <FirstAccessForm needsConsent={!u.consentAt} />
    </AuthShell>
  );
}
