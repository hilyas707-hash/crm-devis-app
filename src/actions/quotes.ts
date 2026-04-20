"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDocumentTotals } from "@/lib/utils";

async function getCompanyId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Non authentifié");
  const companyId = (session.user as any).companyId;
  if (!companyId) throw new Error("Pas d'entreprise associée");
  return companyId as string;
}

async function generateQuoteNumber(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("Entreprise introuvable");
  const number = `${company.quotePrefix}-${String(company.nextQuoteNumber).padStart(3, "0")}`;
  await prisma.company.update({
    where: { id: companyId },
    data: { nextQuoteNumber: company.nextQuoteNumber + 1 },
  });
  return number;
}

type ItemInput = {
  description: string;
  notes?: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discount: number;
  unit?: string;
  productId?: string;
  sortOrder: number;
};

export async function createQuote(data: {
  title?: string;
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
  const companyId = await getCompanyId();
  const number = await generateQuoteNumber(companyId);
  const totals = calculateDocumentTotals(data.items, data.discount, data.discountType);

  const quote = await prisma.quote.create({
    data: {
      number,
      title: data.title || null,
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
          description: item.description,
          notes: item.notes || null,
          quantity: item.quantity,
          unit: item.unit || "unité",
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          discount: item.discount,
          productId: item.productId || null,
          sortOrder: item.sortOrder,
          total: item.quantity * item.unitPrice * (1 - item.discount / 100) * (1 + item.vatRate / 100),
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
  const companyId = await getCompanyId();
  const totals = calculateDocumentTotals(data.items, data.discount, data.discountType);

  await prisma.quoteItem.deleteMany({ where: { quoteId: id } });

  await prisma.quote.update({
    where: { id, companyId },
    data: {
      title: data.title || null,
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
          description: item.description,
          notes: item.notes || null,
          quantity: item.quantity,
          unit: item.unit || "unité",
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          discount: item.discount,
          productId: item.productId || null,
          sortOrder: item.sortOrder,
          total: item.quantity * item.unitPrice * (1 - item.discount / 100) * (1 + item.vatRate / 100),
        })),
      },
    },
  });

  revalidatePath(`/devis/${id}`);
  revalidatePath("/devis");
  redirect(`/devis/${id}`);
}

export async function updateQuoteStatus(id: string, status: string) {
  const companyId = await getCompanyId();
  await prisma.quote.update({ where: { id, companyId }, data: { status } });
  revalidatePath(`/devis/${id}`);
  revalidatePath("/devis");
}

export async function deleteQuote(id: string) {
  const companyId = await getCompanyId();
  await prisma.quote.delete({ where: { id, companyId } });
  revalidatePath("/devis");
  redirect("/devis");
}

export async function convertQuoteToInvoice(quoteId: string) {
  const companyId = await getCompanyId();

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, companyId },
    include: { items: true },
  });
  if (!quote) throw new Error("Devis introuvable");

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("Entreprise introuvable");

  const invoiceNumber = `${company.invoicePrefix}-${String(company.nextInvoiceNumber).padStart(3, "0")}`;
  await prisma.company.update({
    where: { id: companyId },
    data: { nextInvoiceNumber: company.nextInvoiceNumber + 1 },
  });

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const invoice = await prisma.invoice.create({
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

  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: "INVOICED" },
  });

  revalidatePath(`/devis/${quoteId}`);
  revalidatePath("/devis");
  revalidatePath("/factures");
  redirect(`/factures/${invoice.id}`);
}
