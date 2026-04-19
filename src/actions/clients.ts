"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientSchema, contactSchema } from "@/lib/validations/client";

async function getCompanyId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Non authentifié");
  const companyId = (session.user as any).companyId;
  if (!companyId) throw new Error("Pas d'entreprise associée");
  return companyId as string;
}

export async function createClient(formData: FormData) {
  const companyId = await getCompanyId();
  const raw = Object.fromEntries(formData);
  const data = clientSchema.parse({
    ...raw,
    type: raw.type || "COMPANY",
    status: raw.status || "PROSPECT",
    country: raw.country || "Belgique",
  });

  const client = await prisma.client.create({
    data: { ...data, companyId },
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function updateClient(id: string, formData: FormData) {
  const companyId = await getCompanyId();
  const raw = Object.fromEntries(formData);
  const data = clientSchema.parse({
    ...raw,
    type: raw.type || "COMPANY",
    status: raw.status || "PROSPECT",
    country: raw.country || "Belgique",
  });

  await prisma.client.update({
    where: { id, companyId },
    data,
  });

  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
  redirect(`/clients/${id}`);
}

export async function deleteClient(id: string) {
  const companyId = await getCompanyId();
  await prisma.client.delete({ where: { id, companyId } });
  revalidatePath("/clients");
  redirect("/clients");
}

export async function createContact(clientId: string, formData: FormData) {
  const companyId = await getCompanyId();
  const raw = Object.fromEntries(formData);
  const data = contactSchema.parse(raw);

  const client = await prisma.client.findFirst({ where: { id: clientId, companyId } });
  if (!client) throw new Error("Client introuvable");

  await prisma.contact.create({ data: { ...data, clientId } });

  revalidatePath(`/clients/${clientId}`);
}

export async function deleteContact(contactId: string, clientId: string) {
  await prisma.contact.delete({ where: { id: contactId } });
  revalidatePath(`/clients/${clientId}`);
}
