/** Validação de anexos por assinatura binária (não confia em extensão nem Content-Type). */
export const MAX_FILE_BYTES = 4 * 1024 * 1024; // limite de corpo das funções serverless da Vercel ≈ 4,5 MB
export const MAX_FILES_PER_EXPENSE = 6;

export type DetectedFile = { mime: string; ext: string };

export function detectFile(buf: Buffer): DetectedFile | null {
  if (buf.length < 8) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  const head = buf.subarray(0, 512).toString("utf8").replace(/^﻿/, "").trimStart();
  if (/^<\?xml/i.test(head) || /^<(nfeProc|NFe|procNFe)/.test(head)) {
    if (/<script/i.test(buf.toString("utf8", 0, Math.min(buf.length, 200_000)))) return null;
    return { mime: "application/xml", ext: "xml" };
  }
  return null;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[\\/\0\r\n]/g, "_").replace(/[^\p{L}\p{N} ._()-]/gu, "_").slice(0, 120) || "arquivo";
}
