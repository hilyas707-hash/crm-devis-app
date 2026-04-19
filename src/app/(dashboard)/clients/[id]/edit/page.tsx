import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { ClientForm } from "@/components/clients/client-form";
import { updateClient } from "@/actions/clients";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;

  const client = await prisma.client.findFirst({ where: { id, companyId } });
  if (!client) notFound();

  const action = updateClient.bind(null, id);

  const defaultValues = {
    id: client.id,
    type: client.type,
    name: client.name,
    email: client.email ?? undefined,
    phone: client.phone ?? undefined,
    mobile: client.mobile ?? undefined,
    address: client.address ?? undefined,
    city: client.city ?? undefined,
    postalCode: client.postalCode ?? undefined,
    country: client.country,
    vatNumber: client.vatNumber ?? undefined,
    notes: client.notes ?? undefined,
    status: client.status,
  };

  return (
    <div>
      <Header title="Modifier le client" />
      <div className="p-6 max-w-2xl">
        <ClientForm action={action} defaultValues={defaultValues} cancelHref={`/clients/${id}`} />
      </div>
    </div>
  );
}
