"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyId } from "@/lib/session";
import { calculateDocumentTotals } from "@/lib/utils";

// Incrément atomique — évite la race condition sur les numéros dupliqués
async function generateQuoteNumber(companyId: string): Promise<string> {
  const company = await prisma.company.update({
    where: { id: companyId },
    data: { nextQuoteNumber: { increment: 1 } },
    select: { quotePrefix: true, nextQuoteNumber: true },
  });
  return `${company.quotePrefix}-${String(company.nextQuoteNumber).padStart(3, "0")}`;
}

type ItemInput = {
  type?: string;
  description: string;
  notes?: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discount: number;
  unit?: string;
  total?: number;
  productId?: string;
  sortOrder: number;
};

export async function createQuote(data: {
  title?: string;
  introText?: string;
  clientId: string;
  clientRef?: string;
  issueDate: string;
  validUntil?: string;
  notes?: string;
  conditions?: string;
  discount: number;
  discountType: "PERCENT" | "FIXED";
  templateId?: string;
  items: ItemInput[];
}) {
  const companyId = await requireCompanyId();

  // Vérifie que le client appartient bien à la company
  const client = await prisma.client.findFirst({ where: { id: data.clientId, companyId } });
  if (!client) throw new Error("Client introuvable ou accès refusé");

  const number = await generateQuoteNumber(companyId);
  const totals = calculateDocumentTotals(data.items, data.discount, data.discountType);

  const quote = await prisma.quote.create({
    data: {
      number,
      title: data.title || null,
      introText: data.introText || null,
      clientId: data.clientId,
      clientRef: data.clientRef || null,
      companyId,
      issueDate: new Date(data.issueDate),
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      notes: data.notes || null,
      conditions: data.conditions || null,
      discount: data.discount,
      discountType: data.discountType,
      templateId: data.templateId || null,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      total: totals.total,
      status: "DRAFT",
      items: {
        create: data.items.map((item) => ({
          type: item.type || "LINE",
          description: item.description,
          notes: item.notes || null,
          quantity: item.quantity,
          unit: item.unit || "unité",
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          discount: item.discount,
          productId: item.productId || null,
          sortOrder: item.sortOrder,
          total: item.type && item.type !== "LINE"
            ? (item.total ?? 0)
            : item.quantity * item.unitPrice * (1 - item.discount / 100) * (1 + item.vatRate / 100),
        })),
      },
    },
  });

  revalidatePath("/devis");
  redirect(`/devis/${quote.id}`);
}

export async function updateQuote(
  id: string,
  data: {
    title?: string;
    introText?: string;
    clientId: string;
    clientRef?: string;
    issueDate: string;
    validUntil?: string;
    notes?: string;
    conditions?: string;
    discount: number;
    discountType: "PERCENT" | "FIXED";
    items: ItemInput[];
  }
) {
  const companyId = await requireCompanyId();

  // Vérifie ownership + clientId en une seule transaction
  const client = await prisma.client.findFirst({ where: { id: data.clientId, companyId } });
  if (!client) throw new Error("Client introuvable ou accès refusé");

  const totals = calculateDocumentTotals(data.items, data.discount, data.discountType);

  // Transaction pour éviter les items orphelins en cas d'erreur
  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId: id } });
    await tx.quote.update({
      where: { id, companyId },
      data: {
        title: data.title || null,
        introText: data.introText || null,
        clientId: data.clientId,
        clientRef: data.clientRef || null,
        issueDate: new Date(data.issueDate),
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        notes: data.notes || null,
        conditions: data.conditions || null,
        discount: data.discount,
        discountType: data.discountType,
        subtotal: totals.subtotal,
        vatAmount: totals.vatAmount,
        total: totals.total,
        items: {
          create: data.items.map((item) => ({
            type: item.type || "LINE",
            description: item.description,
            notes: item.notes || null,
            quantity: item.quantity,
            unit: item.unit || "unité",
            unitPrice: item.unitPrice,
            vatRate: item.vatRate,
            discount: item.discount,
            productId: item.productId || null,
            sortOrder: item.sortOrder,
            total: item.type && item.type !== "LINE"
              ? (item.total ?? 0)
              : item.quantity * item.unitPrice * (1 - item.discount / 100) * (1 + item.vatRate / 100),
          })),
        },
      },
    });
  });

  revalidatePath(`/devis/${id}`);
  revalidatePath("/devis");
  redirect(`/devis/${id}`);
}

export async function updateQuoteStatus(id: string, status: string) {
  const companyId = await requireCompanyId();
  await prisma.quote.update({ where: { id, companyId }, data: { status } });
  revalidatePath(`/devis/${id}`);
  revalidatePath("/devis");
}

export async function deleteQuote(id: string) {
  const companyId = await requireCompanyId();
  await prisma.quote.delete({ where: { id, companyId } });
  revalidatePath("/devis");
  redirect("/devis");
}

export async function convertQuoteToInvoice(quoteId: string) {
  const companyId = await requireCompanyId();

  // Tout dans une transaction — atomique et sans risque d'état incohérent
  const invoice = await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findFirst({
      where: { id: quoteId, companyId },
      include: { items: true },
    });
    if (!quote) throw new Error("Devis introuvable");

    // Incrément atomique du compteur de factures
    const company = await tx.company.update({
      where: { id: companyId },
      data: { nextInvoiceNumber: { increment: 1 } },
      select: { invoicePrefix: true, nextInvoiceNumber: true },
    });
    const invoiceNumber = `${company.invoicePrefix}-${String(company.nextInvoiceNumber).padStart(3, "0")}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const newInvoice = await tx.invoice.create({
      data: {
        number: invoiceNumber,
        title: quote.title,
        clientId: quote.clientId,
        clientRef: quote.clientRef,
        companyId,
        quoteId: quote.id,
        issueDate: new Date(),
        dueDate,
        notes: quote.notes,
        conditions: quote.conditions,
        discount: quote.discount,
        discountType: quote.discountType,
        subtotal: quote.subtotal,
        vatAmount: quote.vatAmount,
        total: quote.total,
        status: "DRAFT",
        items: {
          create: quote.items.map((item) => ({
            description: item.description,
            notes: item.notes,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate,
            discount: item.discount,
            productId: item.productId,
            sortOrder: item.sortOrder,
            total: item.total,
          })),
        },
      },
    });

    await tx.quote.update({ where: { id: quoteId }, data: { status: "INVOICED" } });

    return newInvoice;
  });

  revalidatePath(`/devis/${quoteId}`);
  revalidatePath("/devis");
  revalidatePath("/factures");
  redirect(`/factures/${invoice.id}`);
}
