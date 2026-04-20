"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompanyId } from "@/lib/session";
import { dealSchema } from "@/lib/validations/deal";

export async function createDeal(formData: FormData) {
  const companyId = await requireCompanyId();
  const raw = Object.fromEntries(formData);
  const data = dealSchema.parse({
    ...raw,
    value: parseFloat(raw.value as string) || 0,
    probability: parseInt(raw.probability as string) || 20,
  });

  const client = await prisma.client.findFirst({ where: { id: data.clientId, companyId } });
  if (!client) throw new Error("Client introuvable");

  const deal = await prisma.deal.create({ data });

  revalidatePath("/deals");
  redirect(`/deals/${deal.id}`);
}

export async function updateDeal(id: string, formData: FormData) {
  const companyId = await requireCompanyId();
  const raw = Object.fromEntries(formData);
  const data = dealSchema.parse({
    ...raw,
    value: parseFloat(raw.value as string) || 0,
    probability: parseInt(raw.probability as string) || 20,
  });

  // Vérifie que le deal appartient bien à la company
  const deal = await prisma.deal.findFirst({ where: { id, client: { companyId } } });
  if (!deal) throw new Error("Opportunité introuvable ou accès refusé");

  const client = await prisma.client.findFirst({ where: { id: data.clientId, companyId } });
  if (!client) throw new Error("Client introuvable");

  await prisma.deal.update({ where: { id }, data });

  revalidatePath(`/deals/${id}`);
  revalidatePath("/deals");
  redirect(`/deals/${id}`);
}

export async function updateDealStage(id: string, stage: string) {
  const companyId = await requireCompanyId();
  const deal = await prisma.deal.findFirst({ where: { id, client: { companyId } } });
  if (!deal) throw new Error("Opportunité introuvable ou accès refusé");

  await prisma.deal.update({ where: { id }, data: { stage } });
  revalidatePath(`/deals/${id}`);
  revalidatePath("/deals");
}

export async function deleteDeal(id: string) {
  const companyId = await requireCompanyId();
  const deal = await prisma.deal.findFirst({ where: { id, client: { companyId } } });
  if (!deal) throw new Error("Opportunité introuvable ou accès refusé");

  await prisma.deal.delete({ where: { id } });
  revalidatePath("/deals");
  redirect("/deals");
}
