import Image from "next/image";

/** Logo oficial da Nortetel (public/logo.png). */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image src="/logo.png" alt="Nortetel" width={40} height={40} priority className="h-10 w-10 rounded-xl" />
      <div className="leading-tight">
        <div className="text-base font-extrabold tracking-tight text-brand-900">Nortetel</div>
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Notas do cartão</div>
      </div>
    </div>
  );
}
