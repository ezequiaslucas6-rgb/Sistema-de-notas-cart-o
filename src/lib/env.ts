import "server-only";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

export const env = {
  get appUrl() {
    return process.env.APP_URL ?? "http://localhost:3000";
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
  get dataKey(): Buffer {
    const key = Buffer.from(required("DATA_ENCRYPTION_KEY"), "base64");
    if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY deve ter 32 bytes em base64");
    return key;
  },
  get cpfSecret() {
    return required("CPF_HASH_SECRET");
  },
  get appSecret() {
    return required("APP_SECRET");
  },
};
