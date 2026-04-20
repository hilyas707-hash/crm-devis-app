import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { InvoiceForm } from "@/components/factures/invoice-form";
import { updateInvoice } from "@/actions/invoices";

export default async function EditFacturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;

  const [invoice, clients, products] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id, companyId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.client.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
  ]);

  if (!invoice) notFound();

  const defaultValues = {
    title: invoice.title || undefined,
    clientId: invoice.clientId,
    clientRef: invoice.clientRef || undefined,
    issueDate: invoice.issueDate.toISOString().split("T")[0],
    dueDate: invoice.dueDate?.toISOString().split("T")[0],
    notes: invoice.notes || undefined,
    conditions: invoice.conditions || undefined,
    discount: invoice.discount,
    discountType: invoice.discountType as "PERCENT" | "FIXED",
    items: invoice.items.map((item) => ({
      id: item.id,
      description: item.description,
      notes: item.notes || undefined,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
      discount: item.discount,
      unit: item.unit,
      productId: item.productId || undefined,
      sortOrder: item.sortOrder,
    })),
  };

  async function handleUpdate(data: any) {
    "use server";
    await updateInvoice(id, data);
  }

  return (
    <div>
      <Header title={`Modifier · ${invoice.number}`} backHref={`/factures/${id}`} />
      <div className="p-4 md:p-6 max-w-4xl">
        <InvoiceForm
          clients={clients}
          products={products}
          action={handleUpdate}
          defaultValues={defaultValues}
          cancelHref={`/factures/${id}`}
        />
      </div>
    </div>
  );
}
