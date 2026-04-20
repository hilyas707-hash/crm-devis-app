import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuotePDFDocument } from "@/components/devis/quote-pdf-document";
import { isValidEmail, sendEmail, buildDocumentEmailHtml } from "@/lib/email";
import React from "react";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const companyId = session.user.companyId as string;
  const userId = session.user.id;
  const body = await request.json();
  const { to, subject, message } = body as { to: string; subject: string; message: string };

  if (!to || !subject || !message) {
    return NextResponse.json({ error: "Destinataire, sujet et message requis" }, { status: 400 });
  }
  if (!isValidEmail(to)) {
    return NextResponse.json({ error: "Adresse email destinataire invalide" }, { status: 400 });
  }

  const [quote, currentUser] = await Promise.all([
    prisma.quote.findFirst({
      where: { id, companyId },
      include: {
        client: true,
        items: { orderBy: { sortOrder: "asc" } },
        company: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, smtpSecure: true, smtpFrom: true },
    }),
  ]);

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
    introText: quote.introText,
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
    client: quote.client,
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

  const smtpUser = currentUser?.smtpUser || process.env.SMTP_USER;
  const smtpPass = currentUser?.smtpPass || process.env.SMTP_PASS;
  const smtpHost = currentUser?.smtpHost || process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = currentUser?.smtpPort || Number(process.env.SMTP_PORT || 587);
  const smtpSecure = currentUser?.smtpSecure ?? (process.env.SMTP_SECURE === "true");
  const fromName = currentUser?.smtpFrom || quote.company.name;

  if (!smtpUser || !smtpPass) {
    return NextResponse.json(
      { error: "Configuration email manquante. Allez dans Paramètres → Email pour configurer votre adresse email." },
      { status: 400 }
    );
  }

  const html = buildDocumentEmailHtml({
    fromName,
    docLabel: "Devis",
    docNumber: quote.number,
    message,
    total: quote.total,
    extraInfo: quote.validUntil
      ? `Valable jusqu'au : ${new Date(quote.validUntil).toLocaleDateString("fr-BE")}`
      : undefined,
    companyPhone: quote.company.phone ?? undefined,
    companyEmail: quote.company.email ?? undefined,
  });

  await sendEmail({
    smtp: { host: smtpHost, port: smtpPort, secure: smtpSecure, user: smtpUser, pass: smtpPass, fromName },
    to,
    subject,
    html,
    attachments: [{ filename: `devis-${quote.number}.pdf`, content: pdfBuffer as Buffer, contentType: "application/pdf" }],
  });

  if (quote.status === "DRAFT") {
    await prisma.quote.update({ where: { id }, data: { status: "SENT" } });
  }

  return NextResponse.json({ success: true });
}
