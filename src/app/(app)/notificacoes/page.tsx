import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { markNotificationsReadAction } from "@/app/actions/admin";
import { PageTitle } from "@/components/Bits";

export const metadata = { title: "Notificações" };
export const dynamic = "force-dynamic";

export default async function Notifications() {
  const u = await requireUser();
  const items = await db.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = items.some((i) => !i.readAt);
  return (
    <>
      <PageTitle title="Notificações">{unread && <form action={markNotificationsReadAction}><button className="btn-secondary">Marcar todas como lidas</button></form>}</PageTitle>
      <div className="card divide-y divide-slate-100">
        {items.length === 0 && <p className="p-5 text-sm text-slate-500">Você não tem notificações.</p>}
        {items.map((n) => {
          const inner = (
            <div className={`px-5 py-3 ${n.readAt ? "" : "bg-brand-50/60"}`}>
              <div className="flex items-center justify-between gap-3"><span className="font-medium">{n.title}</span><span className="shrink-0 text-xs text-slate-400">{n.createdAt.toLocaleString("pt-BR", { timeZone: "America/Porto_Velho" })}</span></div>
              <p className="text-sm text-slate-600">{n.body}</p>
            </div>
          );
          return n.link ? <Link key={n.id} href={n.link} className="block hover:bg-slate-50">{inner}</Link> : <div key={n.id}>{inner}</div>;
        })}
      </div>
    </>
  );
}
