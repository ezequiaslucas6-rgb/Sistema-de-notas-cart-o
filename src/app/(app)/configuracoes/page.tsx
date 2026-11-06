import Link from "next/link";
import { requireRole, toActor } from "@/lib/session";
import { canSeeSettings } from "@/lib/permissions";
import { PageTitle } from "@/components/Bits";
import { SETTINGS_ITEMS, TONE_BG } from "@/components/settingsItems";

export const metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function SettingsHub() {
  const me = await requireRole(canSeeSettings);
  const a = toActor(me);
  const items = SETTINGS_ITEMS.filter((i) => i.can(a));
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <>
      <PageTitle title="Configurações" subtitle="Ajuste regras, segurança e dados da empresa em um só lugar" />
      <div className="!mt-7 space-y-6">
        {groups.map((g) => (
          <section key={g} aria-labelledby={`g-${g}`}>
            <h2 id={`g-${g}`} className="mb-2.5 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">{g}</h2>
            <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {items.filter((i) => i.group === g).map((i) => {
                const body = (
                  <>
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white ${TONE_BG[i.tone]} ${i.href ? "" : "opacity-60"}`}><i.icon className="h-5 w-5" aria-hidden /></span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold text-slate-900">{i.label}</span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-slate-500">{i.desc}</span>
                      <span className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">{i.who}{!i.href && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-500">Em breve</span>}</span>
                    </span>
                  </>
                );
                return i.href ? (
                  <Link key={i.key} href={i.href} className="card relative flex items-start gap-3.5 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">{body}</Link>
                ) : (
                  <div key={i.key} aria-disabled className="card relative flex cursor-not-allowed items-start gap-3.5 p-4 opacity-80">{body}</div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
