"use client";

import { loginAction } from "@/app/actions/auth";
import { Alert, Field, ServerForm, SubmitButton } from "@/components/ui";

export function LoginForm() {
    return (
    <ServerForm action={loginAction} className="space-y-4" autoComplete="on">
      <Alert />
      <Field label="CPF, e-mail ou telefone">
        <input name="identifier" className="input" autoComplete="username" inputMode="text" autoCapitalize="none" required />
      </Field>
      <Field label="Senha">
        <input name="password" type="password" className="input" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="btn-primary w-full" pendingText="Entrando…">Entrar</SubmitButton>
    </ServerForm>
  );
}
