import { isValidCnpj, onlyDigits, parseNfeKey } from "./validators";

export type Suggestion = { date?: string; amount?: string; cnpj?: string; supplier?: string; nfeKey?: string };

const MONEY = /(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/g;

function moneyToNumber(s: string) {
  return Number(s.replace(/\./g, "").replace(",", "."));
}

/** Heurísticas para texto de cupom/nota lido por OCR. Sempre sugestões – o usuário confere. */
export function parseReceiptText(text: string): Suggestion {
  const out: Suggestion = {};
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const m of text.matchAll(/\d{2}\.?\d{3}\.?\d{3}\s?\/?\s?\d{4}\s?-?\s?\d{2}/g)) {
    const d = onlyDigits(m[0]);
    if (isValidCnpj(d)) { out.cnpj = d; break; }
  }

  const keyMatch = text.replace(/[^\d\s]/g, "").match(/(?:\d{4}\s?){11}/);
  if (keyMatch) {
    const k = onlyDigits(keyMatch[0]);
    if (k.length === 44) out.nfeKey = k;
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const m of text.matchAll(/(\d{2})[\/.-](\d{2})[\/.-](\d{4})/g)) {
    const iso = `${m[3]}-${m[2]}-${m[1]}`;
    if (!Number.isNaN(Date.parse(iso)) && iso <= today && iso >= "2015-01-01" && +m[2] >= 1 && +m[2] <= 12) { out.date = iso; break; }
  }

  const totalLines = lines.filter((l) => /(valor\s*(total|a\s*pagar|pago)|^total|total\s*r?\$|a\s*pagar)/i.test(l));
  const fromTotals = totalLines.flatMap((l) => [...l.matchAll(MONEY)].map((m) => m[1]));
  const all = [...text.matchAll(MONEY)].map((m) => m[1]);
  const pick = fromTotals.length ? fromTotals[fromTotals.length - 1] : all.sort((a, b) => moneyToNumber(b) - moneyToNumber(a))[0];
  if (pick) out.amount = pick;

  const name = lines.find((l) => /[A-Za-zÀ-ú]{3,}/.test(l) && !/cnpj|cupom|nota fiscal|nfc-?e|danfe|documento/i.test(l) && l.length >= 4);
  if (name) out.supplier = name.replace(/[^\p{L}\p{N} .&'-]/gu, "").trim().slice(0, 80);
  return out;
}

/** Extrai a chave de 44 dígitos de uma URL de QR Code de NFC-e (parâmetro p= ou chNFe=). */
export function parseQrContent(content: string): Suggestion {
  const m = content.match(/(?:[?&](?:p|chNFe)=)(\d{44})/) ?? content.match(/(\d{44})/);
  if (!m) return {};
  const info = parseNfeKey(m[1]);
  if (!info) return {};
  return { nfeKey: m[1], cnpj: isValidCnpj(info.cnpj) ? info.cnpj : undefined };
}

/** Lê o XML de NF-e/NFC-e (o mais confiável dos métodos). Requer DOMParser (navegador). */
export function parseNfeXml(xml: string): Suggestion {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) return {};
  const q = (sel: string) => doc.querySelector(sel)?.textContent?.trim() ?? "";
  const id = doc.querySelector("infNFe")?.getAttribute("Id")?.replace(/\D/g, "") ?? "";
  const emitted = q("ide > dhEmi") || q("ide > dEmi");
  const vnf = q("total > ICMSTot > vNF");
  return {
    nfeKey: id.length === 44 ? id : undefined,
    cnpj: q("emit > CNPJ") || undefined,
    supplier: q("emit > xFant") || q("emit > xNome") || undefined,
    date: emitted ? emitted.slice(0, 10) : undefined,
    amount: vnf ? vnf.replace(".", ",") : undefined,
  };
}
