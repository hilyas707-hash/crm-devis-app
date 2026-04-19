import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { QuoteForm } from "@/components/devis/quote-form";
import { createQuote } from "@/actions/quotes";

export default async function NewDevisPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;

  const [clients, products, templates] = await Promise.all([
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

  return (
    <div>
      <Header title="Nouveau devis" />
      <div className="p-4 md:p-6 max-w-4xl">
        <QuoteForm clients={clients} products={products} templates={templates} action={createQuote} />
      </div>
    </div>
  );
}
