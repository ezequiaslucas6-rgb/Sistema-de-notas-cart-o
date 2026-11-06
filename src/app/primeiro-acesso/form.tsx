"use client";

import { firstAccessAction } from "@/app/actions/auth";
import { Alert, Field, ServerForm, SubmitButton } from "@/components/ui";

export function FirstAccessForm({ needsConsent, minLength }: { needsConsent: boolean; minLength: number }) {
    return (
    <ServerForm action={firstAccessAction} className="space-y-4">
      <Alert />
      <Field label="Nova senha" hint={`Mínimo de ${minLength} caracteres, com maiúscula, minúscula, número e símbolo.`}>
        <input name="password" type="password" className="input" autoComplete="new-password" required />
      </Field>
      <Field label="Confirmar nova senha">
        <input name="confirm" type="password" className="input" autoComplete="new-password" required />
      </Field>
      {needsConsent && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="accept" className="mt-1 h-4 w-4" required />
          <span>
            Li e aceito a <a href="/privacidade" target="_blank" className="text-brand-600 underline">Política de Privacidade</a> (LGPD).
          </span>
        </label>
      )}
      <SubmitButton className="btn-primary w-full">Salvar e continuar</SubmitButton>
    </ServerForm>
  );
}
