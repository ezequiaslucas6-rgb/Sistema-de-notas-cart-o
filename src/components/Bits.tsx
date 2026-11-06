import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { STATUS_LABEL } from "@/lib/expenses";

/** Faixa da marca no topo da página: título, subtítulo, avisos e ações. */
export function PageTitle({ title, subtitle, notice, children }: { title: string; subtitle?: string; notice?: { text: string; kind?: "ok" | "error" }; children?: React.ReactNode }) {
  return (
    <div className="hero-band">
      <div className="hero-row">
        <div className="min-w-0">
          <h1>{title}</h1>
          {subtitle && <p className="sub">{subtitle}</p>}
          {notice && <div role={notice.kind === "error" ? "alert" : "status"} className={`hero-notice ${notice.kind === "error" ? "err" : ""}`}>{notice.text}</div>}
        </div>
        {children && <div className="hero-actions">{children}</div>}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: "LANCADA" | "REVISADA" }) {
  const ok = status === "REVISADA";
  return (
    <span className={`badge ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
      <i className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  const p = name.trim().split(/\s+/);
  const ini = ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
  return <span aria-hidden className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 ${className}`}>{ini}</span>;
}

const TONES = { blue: "bg-brand-600", cyan: "bg-cyan-500", green: "bg-emerald-500", amber: "bg-amber-500" } as const;

export function Kpi({ label, value, hint, icon: Icon, tone = "blue" }: { label: string; value: string; hint?: string; icon?: LucideIcon; tone?: keyof typeof TONES }) {
  return (
    <div className="card relative p-4 sm:p-5">
      {Icon && <span className={`absolute right-4 top-4 hidden h-10 w-10 place-items-center rounded-xl text-white sm:grid ${TONES[tone]}`}><Icon className="h-5 w-5" aria-hidden /></span>}
      <div className="text-xs font-medium text-slate-500 sm:pr-12">{label}</div>
      <div className="mt-1 whitespace-nowrap text-xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-2xl">{value}</div>
      {hint && <div className="mt-1 text-xs font-semibold text-emerald-700">{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Icon className="h-7 w-7" aria-hidden /></span>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function BarList({ rows, format }: { rows: { label: string; value: number }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-sm text-slate-500">Sem dados no período.</p>;
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between gap-3 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">{format(r.value)}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-slate-100" role="presentation">
            <div className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-cyan-500" style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Pagination({ page, pages, base }: { page: number; pages: number; base: string }) {
  if (pages <= 1) return null;
  const href = (p: number) => `${base}${base.includes("?") ? "&" : "?"}pagina=${p}`;
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      {page > 1 ? <Link className="btn-secondary" href={href(page - 1)}>← Anterior</Link> : <span />}
      <span className="text-slate-500">Página {page} de {pages}</span>
      {page < pages ? <Link className="btn-secondary" href={href(page + 1)}>Próxima →</Link> : <span />}
    </div>
  );
}
