"use client";

import { createContext, useContext, useRef, useState, useTransition } from "react";
import type { FormEvent, ReactNode } from "react";
import type { FormState } from "@/lib/form";

const FormCtx = createContext<{ state: FormState; pending: boolean }>({ state: null, pending: false });

/**
 * Formulário que chama uma server action SEM limpar os campos após o envio
 * (o React 19 zera formulários de `action`, o que faria o usuário redigitar tudo após um erro).
 * Em caso de erro só os campos de senha são limpos; em sucesso, `resetOnSuccess` limpa tudo.
 */
export function ServerForm({ action, children, className, resetOnSuccess = false, autoComplete }: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  children: ReactNode; className?: string; resetOnSuccess?: boolean; autoComplete?: string;
}) {
  const [state, setState] = useState<FormState>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const r = await action(null, fd);
      setState(r);
      if (r?.error) form.querySelectorAll<HTMLInputElement>("input[type=password]").forEach((i) => (i.value = ""));
      else if (r?.ok && resetOnSuccess) form.reset();
    });
  }
  return (
    <FormCtx.Provider value={{ state, pending }}>
      <form ref={ref} onSubmit={onSubmit} className={className} autoComplete={autoComplete}>{children}</form>
    </FormCtx.Provider>
  );
}

export function SubmitButton({ children, className = "btn-primary", pendingText = "Salvando…" }: { children: ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useContext(FormCtx);
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}

export function Alert({ state: given }: { state?: FormState }) {
  const ctx = useContext(FormCtx);
  const state = given === undefined ? ctx.state : given;
  if (!state?.error && !state?.ok) return null;
  const isErr = !!state.error;
  return (
    <div role={isErr ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-sm ${isErr ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
      {state.error ?? state.ok}
    </div>
  );
}

export function Field({ label, error, hint, children, className = "" }: { label: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function ConfirmButton({ children, message, className = "btn-danger" }: { children: ReactNode; message: string; className?: string }) {
  return (
    <button type="submit" className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
