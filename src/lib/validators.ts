/** Utilitários puros (sem dependência de servidor) – usados também no cliente. */

export function onlyDigits(v: string): string {
  return v.replace(/\D/g, "");
}

export function isValidCpf(input: string): boolean {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

export function isValidCnpj(input: string): boolean {
  const cnpj = onlyDigits(input);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cnpj[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

export function formatCpf(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, e) => `${a}.${b}.${c}${e ? "-" + e : ""}`);
}

export function formatCnpj(v: string): string {
  const d = onlyDigits(v).slice(0, 14);
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, e, f) => `${a}.${b}.${c}/${e}${f ? "-" + f : ""}`);
}

export function formatPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, a, b, c) => `(${a}) ${b}${c ? "-" + c : ""}`);
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, a, b, c) => `(${a}) ${b}${c ? "-" + c : ""}`);
}

/** Telefone BR: 10 ou 11 dígitos (DDD + número). Aceita prefixo 55. */
export function normalizePhone(v: string): string | null {
  let d = onlyDigits(v);
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  return d.length === 10 || d.length === 11 ? d : null;
}

export function normalizeEmail(v: string): string {
  return v.trim().toLowerCase();
}

/** "1.234,56" | "1234.56" | "R$ 12,50" -> centavos (inteiro) ou null. */
export function parseMoneyToCents(input: string): number | null {
  let s = input.replace(/[^\d.,-]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type PasswordCheck = { ok: boolean; problems: string[] };

export function checkPassword(pw: string, personal: string[] = []): PasswordCheck {
  const problems: string[] = [];
  if (pw.length < 10) problems.push("mínimo de 10 caracteres");
  if (pw.length > 128) problems.push("máximo de 128 caracteres");
  if (!/[a-z]/.test(pw)) problems.push("uma letra minúscula");
  if (!/[A-Z]/.test(pw)) problems.push("uma letra maiúscula");
  if (!/\d/.test(pw)) problems.push("um número");
  if (!/[^A-Za-z0-9]/.test(pw)) problems.push("um símbolo");
  const lower = pw.toLowerCase();
  if (["senha", "password", "123456", "qwerty", "nortetel"].some((w) => lower.includes(w))) problems.push("não use palavras comuns");
  if (personal.some((p) => p && p.length >= 4 && lower.includes(p.toLowerCase()))) problems.push("não use seus dados pessoais");
  return { ok: problems.length === 0, problems };
}

/** Extrai CNPJ (posições 6–20) e AAMM de uma chave de acesso NF-e/NFC-e de 44 dígitos. */
export function parseNfeKey(key: string): { cnpj: string; yearMonth: string } | null {
  const k = onlyDigits(key);
  if (k.length !== 44) return null;
  return { cnpj: k.slice(6, 20), yearMonth: `20${k.slice(2, 4)}-${k.slice(4, 6)}` };
}
