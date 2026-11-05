"use client";

import Link from "next/link";
import { requestResetAction } from "@/app/actions/auth";
import { AuthShell } from "@/components/AuthShell";
import { Alert, Field, ServerForm, SubmitButton } from "@/components/ui";

export default function ForgotPage() {
    return (
    <AuthShell title="Recuperar senha" subtitle="Enviaremos um link para o e-mail cadastrado.">
      <ServerForm action={requestResetAction} className="space-y-4">
        <Alert />
        <Field label="CPF, e-mail ou telefone">
          <input name="identifier" className="input" required autoCapitalize="none" />
        </Field>
        <SubmitButton className="btn-primary w-full" pendingText="Enviando…">Enviar link</SubmitButton>
        <div className="text-center text-sm">
          <Link href="/login" className="text-brand-600 hover:underline">Voltar ao login</Link>
        </div>
      </ServerForm>
    </AuthShell>
  );
}
