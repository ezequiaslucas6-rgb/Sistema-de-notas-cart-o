import { Camera, Lock, ScanLine } from "lucide-react";
import { Logo } from "./Logo";

/** Login dividido: painel da marca (computador) + formulário. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0059d6] via-[#0098e6] to-[#19c98a] p-14 text-white lg:flex">
        <span aria-hidden className="pointer-events-none absolute -bottom-36 -right-28 h-[460px] w-[460px] rounded-full border-[70px] border-white/10" />
        <Logo tone="light" />
        <div className="relative">
          <h2 className="max-w-md text-4xl font-bold leading-[1.15] tracking-tight">Controle das notas do cartão corporativo, simples e seguro.</h2>
          <p className="mt-4 max-w-sm text-[15px] text-white/90">Lance, confira e acompanhe os gastos da equipe em um só lugar.</p>
          <ul className="mt-8 space-y-3 text-sm">
            <li className="flex items-center gap-3"><Camera className="h-[18px] w-[18px]" aria-hidden /> Fotografe a nota e lance em segundos</li>
            <li className="flex items-center gap-3"><ScanLine className="h-[18px] w-[18px]" aria-hidden /> Leitura automática de QR Code e XML</li>
            <li className="flex items-center gap-3"><Lock className="h-[18px] w-[18px]" aria-hidden /> Dados protegidos conforme a LGPD</li>
          </ul>
        </div>
        <small className="relative text-xs text-white/70">© Nortetel Telecomunicações</small>
      </section>

      <section className="grid min-h-screen place-items-center bg-white px-5 py-10 lg:min-h-0">
        <div className="w-full max-w-[380px]">
          <Logo className="mb-8 justify-center lg:hidden" />
          <h1 className="text-[26px] font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mb-6 mt-1.5 text-slate-500">{subtitle}</p>}
          {!subtitle && <div className="mb-6" />}
          {children}
          <p className="mt-8 text-center text-xs text-slate-400">
            Uso restrito a colaboradores autorizados. <a className="underline hover:text-slate-600" href="/privacidade">Política de privacidade</a>
          </p>
        </div>
      </section>
    </main>
  );
}
