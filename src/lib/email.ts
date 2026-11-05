import "server-only";

type Mail = { to: string; subject: string; text: string; html?: string };

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendEmail(mail: Mail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[email:simulado] para=${mail.to} assunto="${mail.subject}"\n${mail.text}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Nortetel Notas <onboarding@resend.dev>",
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        html: mail.html ?? `<p>${escapeHtml(mail.text).replace(/\n/g, "<br>")}</p>`,
      }),
    });
    if (!res.ok) console.error("[email] falha", res.status, await res.text());
    return res.ok;
  } catch (err) {
    console.error("[email] erro", err);
    return false;
  }
}
