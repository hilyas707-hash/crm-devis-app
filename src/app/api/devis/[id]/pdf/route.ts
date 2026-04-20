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

  const quote = await prisma.quote.findFirst({
    where: { id, companyId },
    include: {
      client: true,
      items: { orderBy: { sortOrder: "asc" } },
      company: true,
      template: true,
    },
  });

  if (!quote) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

  const tpl = quote.template;
  const template = {
    color: tpl?.color ?? quote.company.tplColor,
    font: tpl?.font ?? quote.company.tplFont,
    logo: tpl?.logo ?? quote.company.tplLogo,
    footer: tpl?.footer ?? quote.company.tplFooter,
    showBank: tpl?.showBank ?? quote.company.tplShowBank,
  };

  const data = {
    number: quote.number,
    title: quote.title,
    clientRef: quote.clientRef,
    status: quote.status,
    issueDate: quote.issueDate,
    validUntil: quote.validUntil,
    notes: quote.notes,
    conditions: quote.conditions,
    subtotal: quote.subtotal,
    vatAmount: quote.vatAmount,
    discount: quote.discount,
    discountType: quote.discountType,
    total: quote.total,
    items: quote.items.map((item) => ({
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

  const buffer = await renderToBuffer(
    React.createElement(QuotePDFDocument, { data, template }) as any
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="devis-${quote.number}.pdf"`,
    },
  });
}
