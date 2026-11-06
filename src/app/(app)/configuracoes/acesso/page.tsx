import { requireRole } from "@/lib/session";
import { canManageSystem } from "@/lib/permissions";
import { getSecurity } from "@/lib/settings";
import { PageTitle } from "@/components/Bits";
import { SettingsShell } from "@/components/SettingsShell";
import { SecurityForm } from "@/components/SettingsForms";

export const metadata = { title: "Política de acesso" };
export const dynamic = "force-dynamic";

export default async function AccessPage() {
  await requireRole(canManageSystem);
  const sec = await getSecurity();
  return (
    <>
      <PageTitle title="Política de acesso" subtitle="Senhas, bloqueio por tentativas e duração da sessão" />
      <SettingsShell current="acesso"><SecurityForm sec={sec} /></SettingsShell>
    </>
  );
}
