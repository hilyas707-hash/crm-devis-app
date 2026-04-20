import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { InvoiceForm } from "@/components/factures/invoice-form";
import { createInvoice } from "@/actions/invoices";

export default async function NewFacturePage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;

  const [clients, products] = await Promise.all([
    prisma.client.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
  ]);

  async function handleCreate(data: any) {
    "use server";
    await createInvoice(data);
  }

  return (
    <div>
      <Header title="Nouvelle facture" />
      <div className="p-4 md:p-6 max-w-4xl">
        <InvoiceForm
          clients={clients}
          products={products}
          action={handleCreate}
          cancelHref="/factures"
        />
      </div>
    </div>
  );
}
