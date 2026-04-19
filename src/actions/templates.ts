"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

async function getCompanyId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Non authentifié");
  return (session.user as any).companyId as string;
}

export async function createTemplate(data: {
  name: string;
  isDefault: boolean;
  color: string;
  font: string;
  logo: string | null;
  footer: string;
  showBank: boolean;
  conditions: string;
  autoConditions: boolean;
  vatRates: string;
  paymentMethods: string;
  units: string;
  categories: string;
  validityDays: number;
  showInternalRef: boolean;
  showClientRef: boolean;
  showDelivery: boolean;
  currency: string;
  language: string;
}) {
  const companyId = await getCompanyId();

  if (data.isDefault) {
    await prisma.quoteTemplate.updateMany({
      where: { companyId },
      data: { isDefault: false },
    });
  }

  const tpl = await prisma.quoteTemplate.create({
    data: { ...data, companyId, footer: data.footer || null, conditions: data.conditions || null },
  });

  revalidatePath("/parametres");
  return tpl.id;
}

export async function updateTemplate(id: string, data: {
  name: string;
  isDefault: boolean;
  color: string;
  font: string;
  logo: string | null;
  footer: string;
  showBank: boolean;
  conditions: string;
  autoConditions: boolean;
  vatRates: string;
  paymentMethods: string;
  units: string;
  categories: string;
  validityDays: number;
  showInternalRef: boolean;
  showClientRef: boolean;
  showDelivery: boolean;
  currency: string;
  language: string;
}) {
  const companyId = await getCompanyId();

  const existing = await prisma.quoteTemplate.findFirst({ where: { id, companyId } });
  if (!existing) throw new Error("Template introuvable");

  if (data.isDefault) {
    await prisma.quoteTemplate.updateMany({
      where: { companyId, id: { not: id } },
      data: { isDefault: false },
    });
  }

  await prisma.quoteTemplate.update({
    where: { id },
    data: { ...data, footer: data.footer || null, conditions: data.conditions || null },
  });

  revalidatePath("/parametres");
}

export async function deleteTemplate(id: string) {
  const companyId = await getCompanyId();
  const tpl = await prisma.quoteTemplate.findFirst({ where: { id, companyId } });
  if (!tpl) throw new Error("Template introuvable");

  await prisma.quoteTemplate.delete({ where: { id } });
  revalidatePath("/parametres");
}

export async function setDefaultTemplate(id: string) {
  const companyId = await getCompanyId();
  await prisma.quoteTemplate.updateMany({ where: { companyId }, data: { isDefault: false } });
  await prisma.quoteTemplate.update({ where: { id }, data: { isDefault: true } });
  revalidatePath("/parametres");
}

export async function updateTemplateLogo(id: string, logoBase64: string) {
  const companyId = await getCompanyId();
  await prisma.quoteTemplate.updateMany({
    where: { id, companyId },
    data: { logo: logoBase64 },
  });
  revalidatePath("/parametres");
}
