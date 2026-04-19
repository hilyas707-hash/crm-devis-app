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

export async function createInvoice(data: {
  title?: string;
  clientId: string;
  quoteId?: string;
  issueDate: string;
  dueDate?: string;
  notes?: string;
  conditions?: string;
  discount: number;
  discountType: "PERCENT" | "FIXED";
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    discount: number;
    productId?: string;
    sortOrder: number;
  }>;
}) {
  const companyId = await getCompanyId();
  const number = await generateInvoiceNumber(companyId);
  const totals = calculateDocumentTotals(data.items, data.discount, data.discountType);

  const invoice = await prisma.invoice.create({
    data: {
      number,
      title: data.title,
      clientId: data.clientId,
      companyId,
      quoteId: data.quoteId || null,
      issueDate: new Date(data.issueDate),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes,
      conditions: data.conditions,
      discount: data.discount,
      discountType: data.discountType,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      total: totals.total,
      status: "DRAFT",
      items: {
        create: data.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          discount: item.discount,
          productId: item.productId || null,
          sortOrder: item.sortOrder,
          total:
            item.quantity * item.unitPrice * (1 - item.discount / 100) * (1 + item.vatRate / 100),
        })),
      },
    },
  });

  revalidatePath("/factures");
  redirect(`/factures/${invoice.id}`);
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
