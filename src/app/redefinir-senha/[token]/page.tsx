"use client";

import { use } from "react";
import { resetPasswordAction } from "@/app/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { Alert, Field, ServerForm, SubmitButton } from "@/components/ui";

export default function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
    return (
    <AuthShell title="Criar nova senha">
      <ServerForm action={resetPasswordAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <Alert />
        <Field label="Nova senha" hint="Use maiúscula, minúscula, número e símbolo. O mínimo de caracteres é informado se a senha for recusada.">
          <input name="password" type="password" className="input" autoComplete="new-password" required />
        </Field>
        <Field label="Confirmar nova senha">
          <input name="confirm" type="password" className="input" autoComplete="new-password" required />
        </Field>
        <SubmitButton className="btn-primary w-full">Redefinir senha</SubmitButton>
      </ServerForm>
    </AuthShell>
  );
}
