import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuotePDFDocument } from "@/components/devis/quote-pdf-document";
import React from "react";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const companyId = (session.user as any).companyId;

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
    headerImage: null,
    footerImage: null,
    attachments: null,
  };

  const data = {
    number: invoice.number,
    title: invoice.title,
    clientRef: invoice.clientRef,
    status: invoice.status,
    issueDate: invoice.issueDate,
    validUntil: invoice.dueDate,
    notes: invoice.notes,
    conditions: invoice.conditions,
    subtotal: invoice.subtotal,
    vatAmount: invoice.vatAmount,
    discount: invoice.discount,
    discountType: invoice.discountType,
    total: invoice.total,
    items: invoice.items.map((item) => ({
      description: item.description,
      notes: item.notes,
      quantity: item.quantity,
      unit: item.unit,
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

  const buffer = await renderToBuffer(
    React.createElement(QuotePDFDocument, { data, template, docType: "FACTURE" }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="facture-${invoice.number}.pdf"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
