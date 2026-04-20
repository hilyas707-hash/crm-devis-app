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

  const [invoice, currentUser] = await Promise.all([
    prisma.invoice.findFirst({
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
    client: invoice.client,
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

  const smtpUser = currentUser?.smtpUser || process.env.SMTP_USER;
  const smtpPass = currentUser?.smtpPass || process.env.SMTP_PASS;
  const smtpHost = currentUser?.smtpHost || process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = currentUser?.smtpPort || Number(process.env.SMTP_PORT || 587);
  const smtpSecure = currentUser?.smtpSecure ?? (process.env.SMTP_SECURE === "true");
  const fromName = currentUser?.smtpFrom || invoice.company.name;

  if (!smtpUser || !smtpPass) {
    return NextResponse.json(
      { error: "Configuration email manquante. Allez dans Paramètres → Email pour configurer votre adresse email." },
      { status: 400 }
    );
  }

  const html = buildDocumentEmailHtml({
    fromName,
    docLabel: "Facture",
    docNumber: invoice.number,
    message,
    total: invoice.total,
    extraInfo: invoice.dueDate
      ? `Date d'échéance : ${new Date(invoice.dueDate).toLocaleDateString("fr-BE")}`
      : undefined,
    companyPhone: invoice.company.phone ?? undefined,
    companyEmail: invoice.company.email ?? undefined,
  });

  await sendEmail({
    smtp: { host: smtpHost, port: smtpPort, secure: smtpSecure, user: smtpUser, pass: smtpPass, fromName },
    to,
    subject,
    html,
    attachments: [{ filename: `facture-${invoice.number}.pdf`, content: pdfBuffer as Buffer, contentType: "application/pdf" }],
  });

  if (invoice.status === "DRAFT") {
    await prisma.invoice.update({ where: { id }, data: { status: "SENT" } });
  }

  return NextResponse.json({ success: true });
}
