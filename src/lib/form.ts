export type FormState = { error?: string; ok?: string; fieldErrors?: Record<string, string>; data?: Record<string, string> } | null;

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const optStr = (fd: FormData, k: string) => str(fd, k) || null;
