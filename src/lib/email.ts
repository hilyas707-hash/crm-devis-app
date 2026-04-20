import nodemailer from "nodemailer";

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\n/g, "<br>");
}

function sanitizeSubject(subject: string): string {
  return subject.replace(/[\r\n]/g, "");
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return emailRegex.test(email);
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
}

export async function sendEmail(params: {
  smtp: SmtpConfig;
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}) {
  const transporter = nodemailer.createTransport({
    host: params.smtp.host,
    port: params.smtp.port,
    secure: params.smtp.secure,
    auth: { user: params.smtp.user, pass: params.smtp.pass },
  });

  await transporter.sendMail({
    from: `"${params.smtp.fromName}" <${params.smtp.user}>`,
    to: params.to,
    subject: sanitizeSubject(params.subject),
    html: params.html,
    attachments: params.attachments,
  });
}

export function buildDocumentEmailHtml(params: {
  fromName: string;
  docLabel: string;
  docNumber: string;
  message: string;
  total: number;
  extraInfo?: string;
  companyPhone?: string;
  companyEmail?: string;
}): string {
  const { fromName, docLabel, docNumber, message, total, extraInfo, companyPhone, companyEmail } = params;
  const contact = [companyPhone, companyEmail].filter(Boolean).join(" — ");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#2563eb;color:white;padding:24px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:20px;">${escapeHtml(fromName)}</h1>
    <p style="margin:4px 0 0;opacity:.8;font-size:13px;">${escapeHtml(docLabel)} ${escapeHtml(docNumber)}</p>
  </div>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <p>${escapeHtml(message)}</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
    <p style="font-size:12px;color:#64748b;">
      Vous trouverez ${escapeHtml(docLabel.toLowerCase())} <strong>${escapeHtml(docNumber)}</strong> en pièce jointe (PDF).<br>
      Montant total TTC : <strong>${total.toFixed(2)} €</strong>
      ${extraInfo ? `<br>${escapeHtml(extraInfo)}` : ""}
    </p>
    <p style="font-size:12px;color:#64748b;margin-top:16px;">
      Cordialement,<br>
      <strong>${escapeHtml(fromName)}</strong>
      ${contact ? `<br>${escapeHtml(contact)}` : ""}
    </p>
  </div>
</body>
</html>`;
}
