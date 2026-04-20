"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyId } from "@/lib/session";
import { clientSchema, contactSchema } from "@/lib/validations/client";

export async function createClient(formData: FormData) {
  const companyId = await requireCompanyId();
  const raw = Object.fromEntries(formData);
  const data = clientSchema.parse({
    ...raw,
    type: raw.type || "COMPANY",
    status: raw.status || "PROSPECT",
    country: raw.country || "Belgique",
  });

  const client = await prisma.client.create({ data: { ...data, companyId } });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function updateClient(id: string, formData: FormData) {
  const companyId = await requireCompanyId();
  const raw = Object.fromEntries(formData);
  const data = clientSchema.parse({
    ...raw,
    type: raw.type || "COMPANY",
    status: raw.status || "PROSPECT",
    country: raw.country || "Belgique",
  });

  await prisma.client.update({ where: { id, companyId }, data });

  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
  redirect(`/clients/${id}`);
}

export async function deleteClient(id: string) {
  const companyId = await requireCompanyId();
  await prisma.client.delete({ where: { id, companyId } });
  revalidatePath("/clients");
  redirect("/clients");
}

export async function createContact(clientId: string, formData: FormData) {
  const companyId = await requireCompanyId();
  const raw = Object.fromEntries(formData);
  const data = contactSchema.parse(raw);

  const client = await prisma.client.findFirst({ where: { id: clientId, companyId } });
  if (!client) throw new Error("Client introuvable");

  await prisma.contact.create({ data: { ...data, clientId } });

  revalidatePath(`/clients/${clientId}`);
}

export async function deleteContact(contactId: string, clientId: string) {
  const companyId = await requireCompanyId();

  // Vérifie que le contact appartient à un client de cette company
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, clientId, client: { companyId } },
  });
  if (!contact) throw new Error("Contact introuvable ou accès refusé");

  await prisma.contact.delete({ where: { id: contactId } });
  revalidatePath(`/clients/${clientId}`);
}
