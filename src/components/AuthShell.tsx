import { Logo } from "./Logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-100 via-brand-50 to-emerald-50 px-4 py-10">
      <div className="w-full max-w-md">
        <Logo className="mb-6 justify-center" />
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          Uso restrito a colaboradores autorizados. <a className="underline" href="/privacidade">Política de privacidade</a>
        </p>
      </div>
    </main>
  );
}
