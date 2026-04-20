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

async function generateInvoiceNumber(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("Entreprise introuvable");
  const number = `${company.invoicePrefix}-${String(company.nextInvoiceNumber).padStart(3, "0")}`;
  await prisma.company.update({
    where: { id: companyId },
    data: { nextInvoiceNumber: company.nextInvoiceNumber + 1 },
  });
  return number;
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
  const companyId = await getCompanyId();
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
  const companyId = await getCompanyId();
  const totals = calculateDocumentTotals(data.items, data.discount, data.discountType);

  await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

  await prisma.invoice.update({
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

  revalidatePath(`/factures/${id}`);
  revalidatePath("/factures");
  redirect(`/factures/${id}`);
}

export async function updateInvoiceStatus(id: string, status: string) {
  const companyId = await getCompanyId();
  await prisma.invoice.update({ where: { id, companyId }, data: { status } });
  revalidatePath(`/factures/${id}`);
  revalidatePath("/factures");
}

export async function addPayment(
  invoiceId: string,
  data: {
    amount: number;
    method: string;
    reference?: string;
    date: string;
    notes?: string;
  }
) {
  const companyId = await getCompanyId();

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: { payments: true },
  });
  if (!invoice) throw new Error("Facture introuvable");

  await prisma.payment.create({
    data: {
      invoiceId,
      amount: data.amount,
      method: data.method,
      reference: data.reference,
      date: new Date(data.date),
      notes: data.notes,
    },
  });

  const totalPaid =
    invoice.payments.reduce((s, p) => s + p.amount, 0) + data.amount;

  let status = invoice.status;
  if (totalPaid >= invoice.total) {
    status = "PAID";
  } else if (totalPaid > 0) {
    status = "PARTIAL";
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { paidAmount: totalPaid, status },
  });

  revalidatePath(`/factures/${invoiceId}`);
  revalidatePath("/factures");
}

export async function deleteInvoice(id: string) {
  const companyId = await getCompanyId();
  await prisma.invoice.delete({ where: { id, companyId } });
  revalidatePath("/factures");
  redirect("/factures");
}
