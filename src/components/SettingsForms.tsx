"use client";

import { Alert, Field, ServerForm, SubmitButton } from "./ui";
import { FieldRow, GroupTitle, PaneFooter, PaneHeader, Switch } from "./SettingsUI";
import { saveCardAction, saveCompanyAction, saveRulesAction, saveSecurityAction } from "@/app/actions/settings";
import { formatCnpj } from "@/lib/validators";
import { TIMEZONES, type Company, type Rules, type Security } from "@/lib/settings-schema";

const money = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2).replace(".", ","));

export function RulesForm({ rules }: { rules: Rules }) {
  return (
    <ServerForm action={saveRulesAction} className="card overflow-hidden">
      <PaneHeader title="Regras de lançamento" text="Valem para todos os colaboradores. Cada alteração fica registrada na auditoria." />
      <GroupTitle>Dados exigidos na nota</GroupTitle>
      <Switch name="requireAttachment" defaultChecked={rules.requireAttachment} label="Anexo obrigatório" hint="A nota só é lançada com foto, PDF ou XML anexado." />
      <Switch name="requireCnpj" defaultChecked={rules.requireCnpj} label="Exigir CNPJ do fornecedor" hint="O campo CNPJ passa a ser obrigatório." />
      <Switch name="requireCostCenter" defaultChecked={rules.requireCostCenter} label="Exigir centro de custo" hint="O colaborador precisa escolher o centro de custo." />
      <Switch name="requireProject" defaultChecked={rules.requireProject} label="Exigir projeto" hint="O colaborador precisa escolher o projeto." />
      <Switch name="warnDuplicate" defaultChecked={rules.warnDuplicate} label="Avisar nota duplicada" hint="Alerta quando já existe nota sua com mesma data, valor e fornecedor." />
      <GroupTitle>Limites e prazos</GroupTitle>
      <FieldRow label="Valor máximo por nota (R$)" hint="Notas acima disso não são aceitas. Deixe em branco para não limitar.">
        <input name="maxAmount" inputMode="decimal" defaultValue={money(rules.maxAmountCents)} placeholder="Sem limite" className="input" />
      </FieldRow>
      <FieldRow label="Lançamento retroativo (dias)" hint="Quantos dias para trás a data da compra pode estar. Em branco = sem limite.">
        <input name="maxBackdateDays" inputMode="numeric" defaultValue={rules.maxBackdateDays ?? ""} placeholder="Sem limite" className="input" />
      </FieldRow>
      <GroupTitle>Revisão</GroupTitle>
      <Switch name="managerCanReview" defaultChecked={rules.managerCanReview} label="Gestor de setor pode revisar" hint="Além do financeiro e do administrador, o gestor marca como revisadas as notas do próprio setor (nunca as suas)." />
      <FieldRow label="Destacar notas acima de (R$)" hint="Notas desse valor ou maior, ainda não revisadas, recebem o selo “Valor alto”. Em branco = sem destaque.">
        <input name="highlightAbove" inputMode="decimal" defaultValue={money(rules.highlightAboveCents)} placeholder="Sem destaque" className="input" />
      </FieldRow>
      <PaneFooter>
        <Alert />
        <div className="flex justify-end"><SubmitButton>Salvar alterações</SubmitButton></div>
      </PaneFooter>
    </ServerForm>
  );
}

export function SecurityForm({ sec }: { sec: Security }) {
  const num = (name: string, v: number, min: number, max: number, unit: string) => (
    <div className="relative"><input name={name} type="number" min={min} max={max} defaultValue={v} className="input pr-16" required /><span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">{unit}</span></div>
  );
  return (
    <ServerForm action={saveSecurityAction} className="card overflow-hidden">
      <PaneHeader title="Política de acesso" text="Regras de senha, bloqueio e sessão. Vale para todos os usuários." />
      <GroupTitle>Senha</GroupTitle>
      <FieldRow label="Tamanho mínimo da senha" hint="Entre 8 e 32. Sempre exige maiúscula, minúscula, número e símbolo.">{num("minPasswordLength", sec.minPasswordLength, 8, 32, "caracteres")}</FieldRow>
      <GroupTitle>Bloqueio por tentativas</GroupTitle>
      <FieldRow label="Tentativas erradas até bloquear" hint="Depois disso a conta fica bloqueada temporariamente.">{num("maxFailedLogins", sec.maxFailedLogins, 3, 10, "tentativas")}</FieldRow>
      <FieldRow label="Duração do bloqueio" hint="Tempo em que a conta não aceita login.">{num("lockMinutes", sec.lockMinutes, 5, 240, "minutos")}</FieldRow>
      <GroupTitle>Sessão</GroupTitle>
      <FieldRow label="Sair por inatividade após" hint="Sem usar o sistema por esse tempo, o usuário precisa entrar de novo.">{num("sessionIdleHours", sec.sessionIdleHours, 1, 24, "horas")}</FieldRow>
      <FieldRow label="Duração máxima da sessão" hint="Mesmo usando sempre, o login expira após esse tempo.">{num("sessionMaxHours", sec.sessionMaxHours, 4, 72, "horas")}</FieldRow>
      <PaneFooter>
        <Alert />
        <div className="flex justify-end"><SubmitButton>Salvar política</SubmitButton></div>
      </PaneFooter>
    </ServerForm>
  );
}

export function CompanyForm({ company }: { company: Company }) {
  return (
    <ServerForm action={saveCompanyAction} className="card overflow-hidden">
      <PaneHeader title="Dados da empresa" text="Aparecem nos relatórios e definem o fuso horário das datas e horas." />
      <div className="grid gap-4 px-5 pb-6 sm:grid-cols-2 sm:px-6">
        <Field label="Nome da empresa *" hint="Usado nos relatórios (ex.: Nortetel)."><input name="tradeName" defaultValue={company.tradeName} className="input" required maxLength={80} /></Field>
        <Field label="CNPJ"><input name="cnpj" inputMode="numeric" defaultValue={company.cnpj ? formatCnpj(company.cnpj) : ""} placeholder="00.000.000/0000-00" className="input" onChange={(e) => (e.target.value = formatCnpj(e.target.value))} /></Field>
        <Field label="Razão social" className="sm:col-span-2"><input name="legalName" defaultValue={company.legalName} className="input" maxLength={160} /></Field>
        <Field label="Fuso horário" className="sm:col-span-2" hint="Define como datas e horários aparecem para todos.">
          <select name="timezone" defaultValue={company.timezone} className="input">{TIMEZONES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
        </Field>
      </div>
      <PaneFooter>
        <Alert />
        <div className="flex justify-end"><SubmitButton>Salvar dados</SubmitButton></div>
      </PaneFooter>
    </ServerForm>
  );
}

type Opt = { id: string; name: string };
export function CardForm({ holders, initial, submitLabel = "Adicionar cartão" }: { holders: Opt[]; initial?: { id: string; label: string; last4: string; holderId: string | null; limitCents: number | null }; submitLabel?: string }) {
  return (
    <ServerForm action={saveCardAction} resetOnSuccess={!initial} className="space-y-3">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <Alert />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Nome do cartão"><input name="label" defaultValue={initial?.label} placeholder="Ex.: Visa Corporativo" className="input" required maxLength={60} /></Field>
        <Field label="Final (4 dígitos)"><input name="last4" inputMode="numeric" maxLength={4} defaultValue={initial?.last4} placeholder="1234" className="input" required /></Field>
        <Field label="Titular">
          <select name="holderId" defaultValue={initial?.holderId ?? ""} className="input"><option value="">Sem titular</option>{holders.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
        </Field>
        <Field label="Limite mensal (R$)"><input name="limit" inputMode="decimal" defaultValue={money(initial?.limitCents ?? null)} placeholder="Opcional" className="input" /></Field>
      </div>
      <SubmitButton className={initial ? "btn-secondary" : "btn-primary"}>{submitLabel}</SubmitButton>
    </ServerForm>
  );
}

