import Image from "next/image";

/** Logo oficial da Nortetel (public/logo.png). tone="light" para fundos coloridos. */
export function Logo({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const light = tone === "light";
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image src="/logo.png" alt="Nortetel" width={40} height={40} priority className="h-10 w-10 rounded-xl" />
      <div className="leading-tight">
        <div className={`text-base font-extrabold tracking-tight ${light ? "text-white" : "text-brand-900"}`}>Nortetel</div>
        <div className={`text-[10.5px] font-medium uppercase tracking-[0.09em] ${light ? "text-white/70" : "text-slate-500"}`}>Notas do cartão</div>
      </div>
    </div>
  );
}
