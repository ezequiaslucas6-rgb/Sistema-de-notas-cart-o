import { requireRole } from "@/lib/session";
import { canManageRules } from "@/lib/permissions";
import { getRules } from "@/lib/settings";
import { PageTitle } from "@/components/Bits";
import { SettingsShell } from "@/components/SettingsShell";
import { RulesForm } from "@/components/SettingsForms";

export const metadata = { title: "Regras de lançamento" };
export const dynamic = "force-dynamic";

export default async function RulesPage() {
  await requireRole(canManageRules);
  const rules = await getRules();
  return (
    <>
      <PageTitle title="Regras de lançamento" subtitle="Defina como os colaboradores lançam as notas do cartão" />
      <SettingsShell current="regras"><RulesForm rules={rules} /></SettingsShell>
    </>
  );
}
