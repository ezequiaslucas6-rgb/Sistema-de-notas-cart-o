/* Troque por <img src="/logo.png"> quando o arquivo oficial estiver em /public. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-lg font-black text-white">N</div>
      <div className="leading-tight">
        <div className="text-base font-extrabold tracking-tight text-brand-900">Nortetel</div>
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Notas do cartão</div>
      </div>
    </div>
  );
}
