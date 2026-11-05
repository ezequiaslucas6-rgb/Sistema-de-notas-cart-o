import Link from "next/link";
import { STATUS_LABEL } from "@/lib/expenses";

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: "LANCADA" | "REVISADA" }) {
  return <span className={`badge ${status === "REVISADA" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{STATUS_LABEL[status]}</span>;
}

export function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function BarList({ rows, format }: { rows: { label: string; value: number }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-sm text-slate-500">Sem dados no período.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 font-medium tabular-nums">{format(r.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100" role="presentation">
            <div className="h-2 rounded-full bg-brand-500" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
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
