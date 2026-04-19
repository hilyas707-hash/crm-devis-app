"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dealSchema } from "@/lib/validations/deal";

async function getCompanyId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Non authentifié");
  const companyId = (session.user as any).companyId;
  if (!companyId) throw new Error("Pas d'entreprise associée");
  return companyId as string;
}

export async function createDeal(formData: FormData) {
  const companyId = await getCompanyId();
  const raw = Object.fromEntries(formData);
  const data = dealSchema.parse({
    ...raw,
    value: parseFloat(raw.value as string) || 0,
    probability: parseInt(raw.probability as string) || 20,
  });

  const client = await prisma.client.findFirst({
    where: { id: data.clientId, companyId },
  });
  if (!client) throw new Error("Client introuvable");

  const deal = await prisma.deal.create({ data });

  revalidatePath("/deals");
  redirect(`/deals/${deal.id}`);
}

export async function updateDeal(id: string, formData: FormData) {
  const companyId = await getCompanyId();
  const raw = Object.fromEntries(formData);
  const data = dealSchema.parse({
    ...raw,
    value: parseFloat(raw.value as string) || 0,
    probability: parseInt(raw.probability as string) || 20,
  });

  const client = await prisma.client.findFirst({
    where: { id: data.clientId, companyId },
  });
  if (!client) throw new Error("Client introuvable");

  await prisma.deal.update({ where: { id }, data });

  revalidatePath(`/deals/${id}`);
  revalidatePath("/deals");
  redirect(`/deals/${id}`);
}

export async function updateDealStage(id: string, stage: string) {
  await prisma.deal.update({ where: { id }, data: { stage } });
  revalidatePath("/deals");
}

export async function deleteDeal(id: string) {
  await prisma.deal.delete({ where: { id } });
  revalidatePath("/deals");
  redirect("/deals");
}
