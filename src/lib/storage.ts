import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "./db";

const driver = () => process.env.STORAGE_DRIVER ?? "local";
const LOCAL_DIR = path.join(process.cwd(), "uploads");
const bucket = () => process.env.SUPABASE_BUCKET ?? "notas-anexos";

function supa() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios com STORAGE_DRIVER=supabase");
  return { url, headers: { Authorization: `Bearer ${key}`, apikey: key } };
}

// A chave do arquivo é sempre gerada pelo servidor (nunca vem do usuário).
const safeKey = (key: string) => {
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(key) || key.includes("..")) throw new Error("storageKey inválida");
  return key;
};

export async function putFile(key: string, data: Buffer, mime: string) {
  safeKey(key);
  if (driver() === "db") {
    await db.fileBlob.create({ data: { storageKey: key, data: new Uint8Array(data) } });
    return;
  }
  if (driver() === "supabase") {
    const { url, headers } = supa();
    const res = await fetch(`${url}/storage/v1/object/${bucket()}/${key}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": mime, "x-upsert": "false" },
      body: new Uint8Array(data),
    });
    if (!res.ok) throw new Error(`Falha ao salvar anexo (${res.status})`);
    return;
  }
  const file = path.join(LOCAL_DIR, key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
}

export async function getFile(key: string): Promise<Buffer> {
  safeKey(key);
  if (driver() === "db") {
    const row = await db.fileBlob.findUnique({ where: { storageKey: key } });
    if (!row) throw new Error("Anexo indisponível");
    return Buffer.from(row.data);
  }
  if (driver() === "supabase") {
    const { url, headers } = supa();
    const res = await fetch(`${url}/storage/v1/object/authenticated/${bucket()}/${key}`, { headers });
    if (!res.ok) throw new Error(`Anexo indisponível (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(path.join(LOCAL_DIR, key));
}

export async function deleteFile(key: string) {
  safeKey(key);
  try {
    if (driver() === "db") {
      await db.fileBlob.deleteMany({ where: { storageKey: key } });
      return;
    }
    if (driver() === "supabase") {
      const { url, headers } = supa();
      await fetch(`${url}/storage/v1/object/${bucket()}/${key}`, { method: "DELETE", headers });
      return;
    }
    await unlink(path.join(LOCAL_DIR, key));
  } catch {
    /* já removido */
  }
}
