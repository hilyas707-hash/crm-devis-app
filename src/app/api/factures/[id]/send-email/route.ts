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

  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId },
    include: {
      client: true,
      items: { orderBy: { sortOrder: "asc" } },
      company: true,
    },
  });

  if (!invoice) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });

  const template = {
    color: invoice.company.tplColor,
    font: invoice.company.tplFont,
    logo: invoice.company.tplLogo,
    footer: invoice.company.tplFooter,
    showBank: invoice.company.tplShowBank,
  };

  const data = {
    number: invoice.number,
    title: invoice.title,
    status: invoice.status,
    issueDate: invoice.issueDate,
    validUntil: invoice.dueDate,
    notes: invoice.notes,
    conditions: invoice.conditions,
    subtotal: invoice.subtotal,
    vatAmount: invoice.vatAmount,
    discount: invoice.discount,
    total: invoice.total,
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
      discount: item.discount,
      total: item.total,
    })),
    client: {
      name: invoice.client.name,
      address: invoice.client.address,
      city: invoice.client.city,
      postalCode: invoice.client.postalCode,
      email: invoice.client.email,
      vatNumber: invoice.client.vatNumber,
    },
    company: {
      name: invoice.company.name,
      address: invoice.company.address,
      city: invoice.company.city,
      postalCode: invoice.company.postalCode,
      phone: invoice.company.phone,
      email: invoice.company.email,
      vatNumber: invoice.company.vatNumber,
      iban: invoice.company.iban,
      bic: invoice.company.bic,
      website: invoice.company.website,
    },
  };

  const pdfBuffer = await renderToBuffer(
    React.createElement(QuotePDFDocument, { data, template, docType: "FACTURE" }) as any
  );

  const smtpUser = invoice.company.smtpUser || process.env.SMTP_USER;
  const smtpPass = invoice.company.smtpPass || process.env.SMTP_PASS;
  const smtpHost = invoice.company.smtpHost || process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = invoice.company.smtpPort || Number(process.env.SMTP_PORT || 587);
  const smtpSecure = invoice.company.smtpSecure ?? (process.env.SMTP_SECURE === "true");

  if (!smtpUser || !smtpPass) {
    return NextResponse.json({ error: "Configuration SMTP manquante. Allez dans Paramètres → Email pour configurer votre adresse email." }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const fromName = invoice.company.smtpFrom || invoice.company.name;
  const fromEmail = smtpUser;

  const emailBody = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #2563eb; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
    <h1 style="margin:0; font-size: 20px;">${fromName}</h1>
    <p style="margin:4px 0 0; opacity:.8; font-size:13px;">Facture ${invoice.number}</p>
  </div>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top:none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>${message.replace(/\n/g, "<br>")}</p>
    <hr style="border:none; border-top:1px solid #e2e8f0; margin: 20px 0;">
    <p style="font-size:12px; color:#64748b;">
      Vous trouverez la facture <strong>${invoice.number}</strong> en pièce jointe (PDF).<br>
      Montant total TTC : <strong>${invoice.total.toFixed(2)} €</strong>
      ${invoice.dueDate ? `<br>Date d'échéance : ${new Date(invoice.dueDate).toLocaleDateString("fr-BE")}` : ""}
    </p>
    <p style="font-size:12px; color:#64748b; margin-top:16px;">
      Cordialement,<br><strong>${fromName}</strong><br>
      ${invoice.company.phone || ""}${invoice.company.phone && invoice.company.email ? " — " : ""}${invoice.company.email || ""}
    </p>
  </div>
</body></html>`;

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html: emailBody,
    attachments: [{ filename: `facture-${invoice.number}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
  });

  if (invoice.status === "DRAFT") {
    await prisma.invoice.update({ where: { id }, data: { status: "SENT" } });
  }

  return NextResponse.json({ success: true });
}
