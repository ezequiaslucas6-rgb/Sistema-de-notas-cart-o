import type { ReactNode } from "react";

/** Peças visuais das telas de configuração (sem dependências de servidor). */
export function Switch({ name, defaultChecked, label, hint }: { name: string; defaultChecked?: boolean; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-6 border-b border-slate-100 px-5 py-4 last:border-0 sm:px-6">
      <span>
        <b className="block text-sm font-semibold text-slate-900">{label}</b>
        {hint && <small className="mt-0.5 block max-w-xl text-[12.5px] leading-snug text-slate-500">{hint}</small>}
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-500/30 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition after:content-[''] peer-checked:after:translate-x-5"
      />
    </label>
  );
}

export function FieldRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
      <span>
        <b className="block text-sm font-semibold text-slate-900">{label}</b>
        {hint && <small className="mt-0.5 block max-w-xl text-[12.5px] leading-snug text-slate-500">{hint}</small>}
      </span>
      <span className="w-full shrink-0 sm:w-48">{children}</span>
    </label>
  );
}

export function GroupTitle({ children }: { children: ReactNode }) {
  return <div className="border-y border-slate-100 bg-slate-50 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 sm:px-6">{children}</div>;
}

export function PaneHeader({ title, text }: { title: string; text?: string }) {
  return (
    <div className="px-5 pb-4 pt-5 sm:px-6">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {text && <p className="mt-0.5 text-sm text-slate-500">{text}</p>}
    </div>
  );
}

export function PaneFooter({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">{children}</div>;
}
