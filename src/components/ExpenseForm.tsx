"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Camera, FileText, Loader2, ScanLine, Trash2 } from "lucide-react";
import { Alert, Field, SubmitButton } from "./ui";
import type { FormState } from "@/lib/form";
import { formatCnpj, isValidCnpj, onlyDigits } from "@/lib/validators";
import { parseNfeXml, parseQrContent, parseReceiptText, type Suggestion } from "@/lib/ocr";
import { lookupCnpjAction } from "@/app/actions/expenses";

type Opt = { id: string; name: string };
type Initial = Partial<Record<"id" | "date" | "amount" | "supplier" | "cnpj" | "nfeKey" | "categoryId" | "costCenterId" | "projectId" | "paymentMethod" | "cardLast4" | "cardId" | "description" | "observation", string>>;
type Uploaded = { id: string; filename: string; size: number; file?: File };

const MAX_BYTES = 4 * 1024 * 1024;

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size < 600 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

async function readQr(file: File): Promise<Suggestion> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const { default: jsQR } = await import("jsqr");
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const code = jsQR(img.data, img.width, img.height);
    return code ? parseQrContent(code.data) : {};
  } catch {
    return {};
  }
}

export type FormRules = { requireAttachment: boolean; requireCnpj: boolean; requireCostCenter: boolean; requireProject: boolean; minDate?: string };
type CardOpt = { id: string; label: string; last4: string };

export function ExpenseForm({
  mode, action, categories, costCenters, projects, initial = {}, today, rules, cards = [],
}: {
  mode: "create" | "edit";
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  categories: Opt[]; costCenters: Opt[]; projects: Opt[];
  initial?: Initial; today: string; rules: FormRules; cards?: CardOpt[];
}) {
  const [state, formAction] = useActionState(action, null);
  const d = { ...initial, ...(state?.data ?? {}) } as Initial;
  const fe = state?.fieldErrors ?? {};
  const formRef = useRef<HTMLFormElement>(null);
  const [files, setFiles] = useState<Uploaded[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [ocrMsg, setOcrMsg] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [, startTransition] = useTransition();

  const setField = (name: string, value: string, onlyIfEmpty = true) => {
    const el = formRef.current?.elements.namedItem(name) as HTMLInputElement | null;
    if (el && (!onlyIfEmpty || !el.value)) el.value = value;
  };

  const applySuggestion = (s: Suggestion) => {
    const filled: string[] = [];
    const set = (n: string, v: string | undefined, label: string) => {
      const el = formRef.current?.elements.namedItem(n) as HTMLInputElement | null;
      if (v && el && !el.value) { el.value = v; filled.push(label); }
    };
    set("date", s.date, "data");
    set("amount", s.amount, "valor");
    set("cnpj", s.cnpj ? formatCnpj(s.cnpj) : undefined, "CNPJ");
    set("supplier", s.supplier, "fornecedor");
    set("nfeKey", s.nfeKey, "chave da nota");
    if (s.cnpj && isValidCnpj(s.cnpj)) lookupSupplier(s.cnpj);
    return filled;
  };

  const lookupSupplier = (cnpj: string) => {
    startTransition(async () => {
      const r = await lookupCnpjAction(cnpj);
      if (r.name) setField("supplier", r.name, false);
    });
  };

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setUploadErr("");
    setUploading(true);
    for (const original of Array.from(list)) {
      const file = await compressImage(original);
      if (file.size > MAX_BYTES) { setUploadErr(`"${original.name}" passa de 4 MB.`); continue; }
      const body = new FormData();
      body.append("file", file);
      try {
        const res = await fetch("/api/anexos", { method: "POST", body });
        const j = await res.json();
        if (!res.ok) { setUploadErr(j.error ?? "Falha no envio."); continue; }
        setFiles((f) => [...f, { id: j.id, filename: j.filename, size: j.size, file }]);
      } catch {
        setUploadErr("Sem conexão. Tente novamente.");
      }
    }
    setUploading(false);
  }

  async function readAuto() {
    setOcrBusy(true);
    setOcrMsg("Lendo a nota… (a primeira leitura pode levar alguns segundos)");
    try {
      const filled = new Set<string>();
      const add = (s: Suggestion) => applySuggestion(s).forEach((x) => filled.add(x));
      for (const f of files) {
        const file = f.file;
        if (!file) continue;
        if (file.type === "application/xml" || file.name.toLowerCase().endsWith(".xml")) add(parseNfeXml(await file.text()));
      }
      for (const f of files) {
        if (!f.file?.type.startsWith("image/")) continue;
        add(await readQr(f.file));
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("por");
        const { data } = await worker.recognize(f.file);
        await worker.terminate();
        add(parseReceiptText(data.text));
      }
      setOcrMsg(filled.size ? `Sugerimos: ${[...filled].join(", ")}. Confira antes de salvar.` : "Não consegui ler dados confiáveis. Preencha manualmente.");
    } catch {
      setOcrMsg("A leitura automática falhou. Preencha manualmente.");
    } finally {
      setOcrBusy(false);
    }
  }

  const canOcr = files.some((f) => f.file && (f.file.type.startsWith("image/") || f.file.type === "application/xml"));

  return (
    <form ref={formRef} action={formAction} className="space-y-6">
      {mode === "edit" && <input type="hidden" name="id" value={initial.id} />}
      <Alert state={state} />

      {mode === "create" && (
        <section className="card p-5">
          <h2 className="mb-1 font-semibold">1. Anexe a nota{!rules.requireAttachment && <span className="ml-2 text-xs font-normal text-slate-400">(opcional)</span>}</h2>
          <p className="mb-3 text-sm text-slate-600">Foto (use a câmera do celular), PDF ou XML da nota. Máx. 4 MB por arquivo.</p>
          <div className="flex flex-wrap gap-2">
            <label className="btn-secondary cursor-pointer">
              <Camera className="h-4 w-4" /> Tirar foto / escolher arquivo
              <input type="file" accept="image/*,application/pdf,.xml,application/xml,text/xml" multiple className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
            </label>
            {canOcr && (
              <button type="button" onClick={readAuto} disabled={ocrBusy} className="btn-secondary">
                {ocrBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />} Ler dados automaticamente
              </button>
            )}
          </div>
          {uploading && <p className="mt-3 flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</p>}
          {uploadErr && <p role="alert" className="mt-3 text-sm text-red-600">{uploadErr}</p>}
          {fe.attachments && <p role="alert" className="mt-3 text-sm text-red-600">{fe.attachments}</p>}
          {ocrMsg && <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900" role="status">{ocrMsg}</p>}
          {files.length > 0 && (
            <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {files.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{f.filename}</span><span className="shrink-0 text-xs text-slate-400">{Math.round(f.size / 1024)} KB</span></span>
                  <input type="hidden" name="attachmentIds" value={f.id} />
                  <button type="button" className="text-slate-400 hover:text-red-600" aria-label={`Remover ${f.filename}`} onClick={() => setFiles((x) => x.filter((y) => y.id !== f.id))}><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">{mode === "create" ? "2. Dados da nota" : "Dados da nota"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Data da compra *" error={fe.date}>
            <input name="date" type="date" min={rules.minDate} max={today} defaultValue={d.date ?? today} className="input" required />
          </Field>
          <Field label="Valor (R$) *" error={fe.amount}>
            <input name="amount" inputMode="decimal" placeholder="0,00" defaultValue={d.amount} className="input" required />
          </Field>
          <Field label={`CNPJ do fornecedor${rules.requireCnpj ? " *" : ""}`} error={fe.cnpj}>
            <input name="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00" defaultValue={d.cnpj ? formatCnpj(d.cnpj) : ""} className="input" required={rules.requireCnpj}
              onChange={(e) => { e.target.value = formatCnpj(e.target.value); }}
              onBlur={(e) => { const dg = onlyDigits(e.target.value); if (isValidCnpj(dg)) lookupSupplier(dg); }} />
          </Field>
          <Field label="Fornecedor *" error={fe.supplier}>
            <input name="supplier" defaultValue={d.supplier} className="input" required maxLength={160} />
          </Field>
          <Field label="Categoria *" error={fe.categoryId}>
            <select name="categoryId" defaultValue={d.categoryId ?? ""} className="input" required>
              <option value="" disabled>Selecione…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label={`Centro de custo${rules.requireCostCenter ? " *" : ""}`} error={fe.costCenterId}>
            <select name="costCenterId" defaultValue={d.costCenterId ?? ""} className="input" required={rules.requireCostCenter}>
              <option value="">{rules.requireCostCenter ? "Selecione…" : "—"}</option>
              {costCenters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label={`Projeto${rules.requireProject ? " *" : ""}`} error={fe.projectId}>
            <select name="projectId" defaultValue={d.projectId ?? ""} className="input" required={rules.requireProject}>
              <option value="">{rules.requireProject ? "Selecione…" : "—"}</option>
              {projects.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Forma de pagamento">
            <select name="paymentMethod" defaultValue={d.paymentMethod ?? "CREDITO"} className="input">
              <option value="CREDITO">Cartão corporativo – crédito</option>
              <option value="DEBITO">Cartão corporativo – débito</option>
              <option value="OUTRO">Outro</option>
            </select>
          </Field>
          {cards.length > 0 ? (
            <Field label={`Cartão usado${mode === "create" ? " *" : ""}`} error={fe.cardId}>
              <select name="cardId" defaultValue={d.cardId ?? ""} className="input" required={mode === "create"}>
                <option value="">{mode === "create" ? "Selecione o cartão…" : "—"}</option>
                {cards.map((c) => <option key={c.id} value={c.id}>{c.label} · final {c.last4}</option>)}
              </select>
            </Field>
          ) : (
            <Field label="Final do cartão (4 dígitos)" error={fe.cardLast4}>
              <input name="cardLast4" inputMode="numeric" maxLength={4} defaultValue={d.cardLast4} className="input" placeholder="1234" />
            </Field>
          )}
          <Field label="Chave de acesso da NF-e (44 dígitos)" error={fe.nfeKey}>
            <input name="nfeKey" inputMode="numeric" maxLength={54} defaultValue={d.nfeKey} className="input" />
          </Field>
          <Field label="Descrição do gasto *" error={fe.description} className="sm:col-span-2">
            <input name="description" defaultValue={d.description} className="input" required maxLength={500} placeholder="Ex.: Almoço com cliente – reunião de proposta" />
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            <textarea name="observation" rows={3} defaultValue={d.observation} className="input" maxLength={1000} />
          </Field>
        </div>
        {fe.dup && (
          <label className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <input type="checkbox" name="confirmDup" className="mt-0.5 h-4 w-4" /> Confirmo que esta nota é diferente da já lançada (mesma data, valor e fornecedor).
          </label>
        )}
      </section>

      <div className="flex justify-end gap-2">
        <SubmitButton className="btn-primary min-w-40" pendingText="Salvando…">{mode === "create" ? "Lançar nota" : "Salvar alterações"}</SubmitButton>
      </div>
    </form>
  );
}
