import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuotePDFDocument } from "@/components/devis/quote-pdf-document";
import nodemailer from "nodemailer";
import React from "react";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const companyId = (session.user as any).companyId;
  const body = await request.json();
  const { to, subject, message } = body as { to: string; subject: string; message: string };

  if (!to || !subject) {
    return NextResponse.json({ error: "Destinataire et sujet requis" }, { status: 400 });
  }

  const quote = await prisma.quote.findFirst({
    where: { id, companyId },
    include: {
      client: true,
      items: { orderBy: { sortOrder: "asc" } },
      company: true,
    },
  });

  if (!quote) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

  const template = {
    color: quote.company.tplColor,
    font: quote.company.tplFont,
    logo: quote.company.tplLogo,
    footer: quote.company.tplFooter,
    showBank: quote.company.tplShowBank,
  };

  const data = {
    number: quote.number,
    title: quote.title,
    status: quote.status,
    issueDate: quote.issueDate,
    validUntil: quote.validUntil,
    notes: quote.notes,
    conditions: quote.conditions,
    subtotal: quote.subtotal,
    vatAmount: quote.vatAmount,
    discount: quote.discount,
    total: quote.total,
    items: quote.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
      discount: item.discount,
      total: item.total,
    })),
    client: {
      name: quote.client.name,
      address: quote.client.address,
      city: quote.client.city,
      postalCode: quote.client.postalCode,
      email: quote.client.email,
      vatNumber: quote.client.vatNumber,
    },
    company: {
      name: quote.company.name,
      address: quote.company.address,
      city: quote.company.city,
      postalCode: quote.company.postalCode,
      phone: quote.company.phone,
      email: quote.company.email,
      vatNumber: quote.company.vatNumber,
      iban: quote.company.iban,
      bic: quote.company.bic,
      website: quote.company.website,
    },
  };

  const pdfBuffer = await renderToBuffer(
    React.createElement(QuotePDFDocument, { data, template }) as any
  );

  const smtpUser = quote.company.smtpUser || process.env.SMTP_USER;
  const smtpPass = quote.company.smtpPass || process.env.SMTP_PASS;
  const smtpHost = quote.company.smtpHost || process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = quote.company.smtpPort || Number(process.env.SMTP_PORT || 587);
  const smtpSecure = quote.company.smtpSecure ?? (process.env.SMTP_SECURE === "true");

  if (!smtpUser || !smtpPass) {
    return NextResponse.json({ error: "Configuration SMTP manquante. Allez dans Paramètres → Email pour configurer votre adresse email." }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const fromName = quote.company.smtpFrom || quote.company.name;
  const fromEmail = smtpUser;

  const emailBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #2563eb; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="margin:0; font-size: 20px;">${fromName}</h1>
    <p style="margin:4px 0 0; opacity:.8; font-size:13px;">Devis ${quote.number}</p>
  </div>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top:none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>${message.replace(/\n/g, "<br>")}</p>
    <hr style="border:none; border-top:1px solid #e2e8f0; margin: 20px 0;">
    <p style="font-size:12px; color:#64748b;">
      Vous trouverez le devis <strong>${quote.number}</strong> en pièce jointe (PDF).<br>
      Montant total TTC : <strong>${quote.total.toFixed(2)} €</strong>
      ${quote.validUntil ? `<br>Valable jusqu'au : ${new Date(quote.validUntil).toLocaleDateString("fr-BE")}` : ""}
    </p>
    <p style="font-size:12px; color:#64748b; margin-top:16px;">
      Cordialement,<br>
      <strong>${fromName}</strong><br>
      ${quote.company.phone || ""}${quote.company.phone && quote.company.email ? " — " : ""}${quote.company.email || ""}
    </p>
  </div>
</body>
</html>
`;

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html: emailBody,
    attachments: [
      {
        filename: `devis-${quote.number}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });

  // Mark quote as SENT if still DRAFT
  if (quote.status === "DRAFT") {
    await prisma.quote.update({ where: { id }, data: { status: "SENT" } });
  }

  return NextResponse.json({ success: true });
}
