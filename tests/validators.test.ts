import { describe, expect, it } from "vitest";
import { checkPassword, formatBRL, isValidCnpj, isValidCpf, normalizePhone, parseMoneyToCents, parseNfeKey } from "../src/lib/validators";
import { parseQrContent, parseReceiptText } from "../src/lib/ocr";
import { assignableRoles, canAdminUser, canViewExpense, expenseScope } from "../src/lib/permissions";

describe("validators", () => {
  it("valida CPF", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("529.982.247-24")).toBe(false);
  });
  it("valida CNPJ", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
  });
  it("normaliza telefone", () => {
    expect(normalizePhone("(69) 99999-1234")).toBe("69999991234");
    expect(normalizePhone("+55 69 3322-1100")).toBe("6933221100");
    expect(normalizePhone("123")).toBeNull();
  });
  it("converte dinheiro", () => {
    expect(parseMoneyToCents("1.234,56")).toBe(123456);
    expect(parseMoneyToCents("R$ 12,5")).toBe(1250);
    expect(parseMoneyToCents("0")).toBeNull();
    expect(parseMoneyToCents("abc")).toBeNull();
    expect(formatBRL(123456)).toMatch(/1\.234,56/);
  });
  it("política de senha", () => {
    expect(checkPassword("curta").ok).toBe(false);
    expect(checkPassword("Zebra#Lapis7Mar").ok).toBe(true);
    expect(checkPassword("Minhasenha#123A").ok).toBe(false);
  });
  it("extrai CNPJ da chave NF-e", () => {
    const key = "35240511222333000181550010000012341000012349";
    expect(parseNfeKey(key)?.cnpj).toBe("11222333000181");
    expect(parseNfeKey("123")).toBeNull();
  });
});

describe("ocr", () => {
  it("lê cupom", () => {
    const s = parseReceiptText("POSTO BOM CAMINHO LTDA\nCNPJ 11.222.333/0001-81\n05/11/2025 14:22\nGASOLINA 30,00\nVALOR TOTAL R$ 250,90");
    expect(s.cnpj).toBe("11222333000181");
    expect(s.amount).toBe("250,90");
    expect(s.date).toBe("2025-11-05");
    expect(s.supplier).toContain("POSTO BOM CAMINHO");
  });
  it("lê QR de NFC-e", () => {
    const r = parseQrContent("https://www.sefaz.xx.gov.br/nfce?p=35240511222333000181550010000012341000012349|2|1|1|ABC");
    expect(r.nfeKey).toHaveLength(44);
    expect(r.cnpj).toBe("11222333000181");
  });
});

describe("permissões", () => {
  const admin = { id: "a", role: "ADMIN", sectorId: null } as const;
  const fin = { id: "f", role: "FINANCEIRO", sectorId: null } as const;
  const gestor = { id: "g", role: "GESTOR", sectorId: "s1" } as const;
  const user = { id: "u", role: "USUARIO", sectorId: "s1" } as const;
  it("escopo de notas", () => {
    expect(expenseScope(admin)).toEqual({ deletedAt: null });
    expect(expenseScope(fin)).toEqual({ deletedAt: null });
    expect(expenseScope(user)).toEqual({ deletedAt: null, userId: "u" });
    expect(JSON.stringify(expenseScope(gestor))).toContain("s1");
  });
  it("visualização individual", () => {
    expect(canViewExpense(user, { userId: "u", sectorId: "s1" })).toBe(true);
    expect(canViewExpense(user, { userId: "x", sectorId: "s1" })).toBe(false);
    expect(canViewExpense(gestor, { userId: "x", sectorId: "s1" })).toBe(true);
    expect(canViewExpense(gestor, { userId: "x", sectorId: "s2" })).toBe(false);
  });
  it("gestão de usuários", () => {
    expect(assignableRoles(gestor)).toEqual(["USUARIO"]);
    expect(assignableRoles(user)).toEqual([]);
    expect(canAdminUser(gestor, { id: "z", role: "USUARIO", sectorId: "s1" })).toBe(true);
    expect(canAdminUser(gestor, { id: "z", role: "USUARIO", sectorId: "s2" })).toBe(false);
    expect(canAdminUser(fin, { id: "z", role: "ADMIN", sectorId: null })).toBe(false);
  });
});
