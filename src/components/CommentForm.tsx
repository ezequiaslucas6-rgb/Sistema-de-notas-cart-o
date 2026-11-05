"use client";

import { addCommentAction } from "@/app/actions/expenses";
import { Alert, ServerForm, SubmitButton } from "./ui";

export function CommentForm({ expenseId }: { expenseId: string }) {
  return (
    <ServerForm action={addCommentAction} resetOnSuccess className="space-y-2">
      <input type="hidden" name="id" value={expenseId} />
      <Alert />
      <textarea name="text" rows={2} required maxLength={1000} className="input" placeholder="Adicionar observação…" />
      <SubmitButton className="btn-secondary" pendingText="Enviando…">Adicionar observação</SubmitButton>
    </ServerForm>
  );
}
