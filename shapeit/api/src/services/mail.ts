import nodemailer from "nodemailer";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL =
  process.env.SHAPEIT_NOTIFY_FROM ?? process.env.MAIL_FROM ?? "ShapeIt <notify@shapeit.shigotoku.com>";

async function sendViaResend(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY が未設定です");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

async function sendViaSmtp(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error(
      "メール送信が未設定です。RESEND_API_KEY または SMTP_HOST / SMTP_USER / SMTP_PASS を設定してください。",
    );
  }
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  const from = process.env.MAIL_FROM || user;
  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text ?? input.html.replace(/<[^>]+>/g, ""),
  });
}

export function isMailConfigured(): boolean {
  return Boolean(
    RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
  );
}

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  if (RESEND_API_KEY) {
    await sendViaResend(input);
    return;
  }
  await sendViaSmtp(input);
}
