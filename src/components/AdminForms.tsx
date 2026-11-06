"use client";

import type { Role } from "@prisma/client";
import { Alert, Field, ServerForm, SubmitButton } from "./ui";
import { anonymizeUserAction, createApiTokenAction, createUserAction, resetUserPasswordAction, saveCatalogAction, updateContactAction, updateUserAction } from "@/app/actions/admin";
import { changePasswordAction } from "@/app/actions/auth";
import { formatCpf, formatPhone } from "@/lib/validators";

type Opt = { id: string; name: string };
const ROLE_LABEL: Record<Role, string> = { ADMIN: "Administrador", FINANCEIRO: "Financeiro", GESTOR: "Gestor de setor", USUARIO: "Colaborador" };

export function CreateUserForm({ roles, sectors, lockedSectorId }: { roles: Role[]; sectors: Opt[]; lockedSectorId?: string | null }) {
    return (
    <ServerForm action={createUserAction} resetOnSuccess className="card space-y-4 p-5" autoComplete="off">
      <Alert />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo *" className="sm:col-span-2"><input name="name" className="input" required minLength={3} /></Field>
        <Field label="CPF *"><input name="cpf" inputMode="numeric" className="input" required placeholder="000.000.000-00" onChange={(e) => (e.target.value = formatCpf(e.target.value))} /></Field>
        <Field label="Perfil *">
          <select name="role" className="input" defaultValue="USUARIO">{roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
        </Field>
        <Field label="E-mail"><input name="email" type="email" className="input" autoComplete="off" /></Field>
        <Field label="Telefone" hint="Informe e-mail ou telefone."><input name="phone" inputMode="tel" className="input" placeholder="(69) 99999-9999" onChange={(e) => (e.target.value = formatPhone(e.target.value))} /></Field>
        {!lockedSectorId && (
          <Field label="Setor (obrigatório para colaboradores)">
            <select name="sectorId" className="input" defaultValue=""><option value="">—</option>{sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </Field>
        )}
      </div>
      <p className="text-xs text-slate-500">Uma senha temporária será gerada. No primeiro acesso a pessoa define a senha pessoal e aceita a política de privacidade.</p>
      <SubmitButton>Criar usuário</SubmitButton>
    </ServerForm>
  );
}

export function EditUserForm({ u, roles, sectors, lockedSector, self }: { u: { id: string; name: string; email: string | null; phone: string | null; role: Role; sectorId: string | null; active: boolean }; roles: Role[]; sectors: Opt[]; lockedSector: boolean; self: boolean }) {
    const allRoles = roles.includes(u.role) ? roles : [u.role, ...roles];
  return (
    <ServerForm action={updateUserAction} className="card space-y-4 p-5">
      <input type="hidden" name="id" value={u.id} />
      <Alert />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo" className="sm:col-span-2"><input name="name" defaultValue={u.name} className="input" required minLength={3} /></Field>
        <Field label="E-mail"><input name="email" type="email" defaultValue={u.email ?? ""} className="input" /></Field>
        <Field label="Telefone"><input name="phone" defaultValue={u.phone ? formatPhone(u.phone) : ""} className="input" onChange={(e) => (e.target.value = formatPhone(e.target.value))} /></Field>
        <Field label="Perfil"><select name="role" defaultValue={u.role} className="input" disabled={roles.length === 0}>{allRoles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field>
        {!lockedSector && <Field label="Setor"><select name="sectorId" defaultValue={u.sectorId ?? ""} className="input"><option value="">—</option>{sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>}
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={u.active} disabled={self} className="h-4 w-4" /> Usuário ativo (pode entrar no sistema)</label>
      {self && <input type="hidden" name="active" value="on" />}
      <SubmitButton>Salvar</SubmitButton>
    </ServerForm>
  );
}

export function ResetPasswordForm({ id }: { id: string }) {
    return (
    <ServerForm action={resetUserPasswordAction} className="card space-y-3 p-5">
      <input type="hidden" name="id" value={id} />
      <h2 className="font-semibold">Redefinir senha</h2>
      <p className="text-sm text-slate-600">Gera nova senha temporária e encerra as sessões desta pessoa.</p>
      <Alert />
      <SubmitButton className="btn-secondary">Gerar nova senha temporária</SubmitButton>
    </ServerForm>
  );
}

export function AnonymizeForm({ id }: { id: string }) {
    return (
    <ServerForm action={anonymizeUserAction} className="card space-y-3 border-red-200 p-5">
      <input type="hidden" name="id" value={id} />
      <h2 className="font-semibold text-red-700">Anonimizar dados pessoais (LGPD)</h2>
      <p className="text-sm text-slate-600">Remove nome, CPF, e-mail e telefone de forma irreversível. As notas são mantidas por obrigação fiscal, sem identificar a pessoa.</p>
      <Alert />
      <input name="confirm" className="input" placeholder='Digite "ANONIMIZAR"' autoComplete="off" />
      <SubmitButton className="btn-danger">Anonimizar</SubmitButton>
    </ServerForm>
  );
}

export function CatalogForm({ kind, label, withCode }: { kind: string; label: string; withCode?: boolean }) {
    return (
    <ServerForm action={saveCatalogAction} resetOnSuccess className="space-y-2">
      <input type="hidden" name="kind" value={kind} />
      <Alert />
      <div className="flex gap-2">
        {withCode && <input name="code" className="input w-28" placeholder="Código" maxLength={20} />}
        <input name="name" className="input" placeholder={label} required maxLength={80} />
        <SubmitButton pendingText="…">Adicionar</SubmitButton>
      </div>
    </ServerForm>
  );
}

export function ApiTokenForm() {
    return (
    <ServerForm action={createApiTokenAction} resetOnSuccess className="space-y-2">
      <Alert />
      <div className="flex gap-2">
        <input name="name" className="input" placeholder="Nome do token (ex.: Contabilidade)" required />
        <SubmitButton pendingText="…">Gerar token</SubmitButton>
      </div>
    </ServerForm>
  );
}

export function ContactForm({ email, phone }: { email: string | null; phone: string | null }) {
    return (
    <ServerForm action={updateContactAction} className="space-y-3">
      <Alert />
      <Field label="E-mail"><input name="email" type="email" defaultValue={email ?? ""} className="input" /></Field>
      <Field label="Telefone"><input name="phone" defaultValue={phone ? formatPhone(phone) : ""} className="input" onChange={(e) => (e.target.value = formatPhone(e.target.value))} /></Field>
      <SubmitButton>Salvar contatos</SubmitButton>
    </ServerForm>
  );
}

export function ChangePasswordForm({ minLength = 10 }: { minLength?: number }) {
    return (
    <ServerForm action={changePasswordAction} resetOnSuccess className="space-y-3">
      <Alert />
      <Field label="Senha atual"><input name="current" type="password" autoComplete="current-password" className="input" required /></Field>
      <Field label="Nova senha" hint={`Mínimo de ${minLength} caracteres, com maiúscula, minúscula, número e símbolo.`}><input name="password" type="password" autoComplete="new-password" className="input" required /></Field>
      <Field label="Confirmar nova senha"><input name="confirm" type="password" autoComplete="new-password" className="input" required /></Field>
      <SubmitButton>Alterar senha</SubmitButton>
    </ServerForm>
  );
}
