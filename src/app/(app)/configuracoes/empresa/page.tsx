import { requireRole } from "@/lib/session";
import { canManageSystem } from "@/lib/permissions";
import { getCompany } from "@/lib/settings";
import { PageTitle } from "@/components/Bits";
import { SettingsShell } from "@/components/SettingsShell";
import { CompanyForm } from "@/components/SettingsForms";

export const metadata = { title: "Dados da empresa" };
export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  await requireRole(canManageSystem);
  const company = await getCompany();
  return (
    <>
      <PageTitle title="Dados da empresa" subtitle="Identificação nos relatórios e fuso horário" />
      <SettingsShell current="empresa"><CompanyForm company={company} /></SettingsShell>
    </>
  );
}
