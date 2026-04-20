import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { QuoteForm } from "@/components/devis/quote-form";
import { updateQuote } from "@/actions/quotes";

export default async function EditDevisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;

  const [quote, clients, products, templates] = await Promise.all([
    prisma.quote.findFirst({
      where: { id, companyId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.client.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    prisma.quoteTemplate.findMany({
      where: { companyId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: {
        id: true, name: true, isDefault: true, color: true, font: true,
        validityDays: true, conditions: true, autoConditions: true,
        vatRates: true, units: true, categories: true, currency: true,
      },
    }),
  ]);

  if (!quote) notFound();

  const defaultValues = {
    title: quote.title || undefined,
    clientId: quote.clientId,
    clientRef: quote.clientRef || undefined,
    issueDate: quote.issueDate.toISOString().split("T")[0],
    validUntil: quote.validUntil?.toISOString().split("T")[0],
    notes: quote.notes || undefined,
    conditions: quote.conditions || undefined,
    discount: quote.discount,
    discountType: quote.discountType as "PERCENT" | "FIXED",
    templateId: quote.templateId || undefined,
    items: quote.items.map((item) => ({
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
    await updateQuote(id, data);
  }

  return (
    <div>
      <Header title={`Modifier ${quote.number}`} />
      <div className="p-4 md:p-6 max-w-4xl">
        <QuoteForm
          clients={clients}
          products={products}
          templates={templates}
          action={handleUpdate}
          defaultValues={defaultValues}
          cancelHref={`/devis/${id}`}
        />
      </div>
    </div>
  );
}
