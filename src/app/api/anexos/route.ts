import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { assertSameOrigin } from "@/lib/request";
import { rateLimit } from "@/lib/ratelimit";
import { detectFile, MAX_FILE_BYTES, sanitizeFilename } from "@/lib/files";
import { sha256 } from "@/lib/crypto";
import { putFile } from "@/lib/storage";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await assertSameOrigin(req))) return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const u = await getSessionUser();
  if (!u || u.mustChangePassword || !u.consentAt) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!(await rateLimit(`upload:${u.id}`, 60, 10 * 60)).ok) return NextResponse.json({ error: "Muitos envios. Aguarde alguns minutos." }, { status: 429 });

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_FILE_BYTES + 64 * 1024) return NextResponse.json({ error: "Arquivo muito grande (máx. 4 MB)." }, { status: 413 });

  let file: File | null = null;
  try {
    const fd = await req.formData();
    const f = fd.get("file");
    file = f instanceof File ? f : null;
  } catch {
    return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  }
  if (!file || file.size === 0) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "Arquivo muito grande (máx. 4 MB)." }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const kind = detectFile(buf);
  if (!kind) return NextResponse.json({ error: "Formato não aceito. Envie JPG, PNG, WEBP, PDF ou XML." }, { status: 415 });

  const key = `u/${u.id}/${Date.now()}-${randomBytes(8).toString("hex")}.${kind.ext}`;
  await putFile(key, buf, kind.mime);
  const att = await db.attachment.create({
    data: { uploadedBy: u.id, storageKey: key, filename: sanitizeFilename(file.name), mime: kind.mime, size: buf.length, sha256: sha256(buf) },
  });
  await audit({ actor: u, action: "anexo.enviado", entity: "Attachment", entityId: att.id });
  return NextResponse.json({ id: att.id, filename: att.filename, mime: att.mime, size: att.size });
}
