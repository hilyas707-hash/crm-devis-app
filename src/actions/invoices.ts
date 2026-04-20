"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyId } from "@/lib/session";
import { calculateDocumentTotals } from "@/lib/utils";

// Incrément atomique — évite les numéros dupliqués en cas de requêtes simultanées
async function generateInvoiceNumber(companyId: string): Promise<string> {
  const company = await prisma.company.update({
    where: { id: companyId },
    data: { nextInvoiceNumber: { increment: 1 } },
    select: { invoicePrefix: true, nextInvoiceNumber: true },
  });
  return `${company.invoicePrefix}-${String(company.nextInvoiceNumber).padStart(3, "0")}`;
}

type InvoiceItemInput = {
  description: string;
  notes?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  vatRate: number;
  discount: number;
  productId?: string;
  sortOrder: number;
};

type InvoiceInput = {
  title?: string;
  clientId: string;
  clientRef?: string;
  quoteId?: string;
  issueDate: string;
  dueDate?: string;
  notes?: string;
  conditions?: string;
  discount: number;
  discountType: "PERCENT" | "FIXED";
  items: InvoiceItemInput[];
};

export async function createInvoice(data: InvoiceInput) {
  const companyId = await requireCompanyId();

  // Vérifie que le client appartient à la company
  const client = await prisma.client.findFirst({ where: { id: data.clientId, companyId } });
  if (!client) throw new Error("Client introuvable ou accès refusé");

  const number = await generateInvoiceNumber(companyId);
  const totals = calculateDocumentTotals(data.items, data.discount, data.discountType);

  const invoice = await prisma.invoice.create({
    data: {
      number,
      title: data.title || null,
      clientId: data.clientId,
      clientRef: data.clientRef || null,
      companyId,
      quoteId: data.quoteId || null,
      issueDate: new Date(data.issueDate),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes || null,
      conditions: data.conditions || null,
      discount: data.discount,
      discountType: data.discountType,
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

  revalidatePath("/factures");
  redirect(`/factures/${invoice.id}`);
}

export async function updateInvoice(id: string, data: InvoiceInput) {
  const companyId = await requireCompanyId();

  const client = await prisma.client.findFirst({ where: { id: data.clientId, companyId } });
  if (!client) throw new Error("Client introuvable ou accès refusé");

  const totals = calculateDocumentTotals(data.items, data.discount, data.discountType);

  // Transaction — rollback si la mise à jour échoue après suppression des items
  await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    await tx.invoice.update({
      where: { id, companyId },
      data: {
        title: data.title || null,
        clientId: data.clientId,
        clientRef: data.clientRef || null,
        issueDate: new Date(data.issueDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
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
  });

  revalidatePath(`/factures/${id}`);
  revalidatePath("/factures");
  redirect(`/factures/${id}`);
}

export async function updateInvoiceStatus(id: string, status: string) {
  const companyId = await requireCompanyId();
  await prisma.invoice.update({ where: { id, companyId }, data: { status } });
  revalidatePath(`/factures/${id}`);
  revalidatePath("/factures");
}

export async function addPayment(
  invoiceId: string,
  data: { amount: number; method: string; reference?: string; date: string; notes?: string }
) {
  const companyId = await requireCompanyId();

  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId } });
  if (!invoice) throw new Error("Facture introuvable");

  // Transaction + _sum agrégé — évite la race condition sur paidAmount
  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId,
        amount: data.amount,
        method: data.method,
        reference: data.reference,
        date: new Date(data.date),
        notes: data.notes,
      },
    });

    const { _sum } = await tx.payment.aggregate({
      where: { invoiceId },
      _sum: { amount: true },
    });

    const totalPaid = _sum.amount ?? 0;
    const status =
      totalPaid >= invoice.total ? "PAID" :
      totalPaid > 0 ? "PARTIAL" :
      invoice.status;

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: totalPaid, status },
    });
  });

  revalidatePath(`/factures/${invoiceId}`);
  revalidatePath("/factures");
}

export async function deleteInvoice(id: string) {
  const companyId = await requireCompanyId();
  await prisma.invoice.delete({ where: { id, companyId } });
  revalidatePath("/factures");
  redirect("/factures");
}
