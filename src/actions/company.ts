"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getCompanyId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Non authentifié");
  const companyId = (session.user as any).companyId;
  if (!companyId) throw new Error("Pas d'entreprise associée");
  return companyId as string;
}

export async function updateCompany(formData: FormData) {
  const companyId = await getCompanyId();
  const raw = Object.fromEntries(formData);

  await prisma.company.update({
    where: { id: companyId },
    data: {
      name: raw.name as string,
      email: (raw.email as string) || null,
      phone: (raw.phone as string) || null,
      address: (raw.address as string) || null,
      city: (raw.city as string) || null,
      postalCode: (raw.postalCode as string) || null,
      country: (raw.country as string) || "Belgique",
      vatNumber: (raw.vatNumber as string) || null,
      website: (raw.website as string) || null,
      iban: (raw.iban as string) || null,
      bic: (raw.bic as string) || null,
      quotePrefix: (raw.quotePrefix as string) || "DEV",
      invoicePrefix: (raw.invoicePrefix as string) || "FAC",
    },
  });

  revalidatePath("/parametres");
}

export async function updateQuoteTemplate(formData: FormData) {
  const companyId = await getCompanyId();
  const raw = Object.fromEntries(formData);

  await prisma.company.update({
    where: { id: companyId },
    data: {
      tplColor: (raw.tplColor as string) || "#2563eb",
      tplFont: (raw.tplFont as string) || "Helvetica",
      tplFooter: (raw.tplFooter as string) || null,
      tplConditions: (raw.tplConditions as string) || null,
      tplShowBank: raw.tplShowBank === "true",
    },
  });

  revalidatePath("/parametres");
}

export async function updateCompanyLogo(logoBase64: string) {
  const companyId = await getCompanyId();
  await prisma.company.update({
    where: { id: companyId },
    data: { tplLogo: logoBase64 },
  });
  revalidatePath("/parametres");
}

export async function removeCompanyLogo() {
  const companyId = await getCompanyId();
  await prisma.company.update({
    where: { id: companyId },
    data: { tplLogo: null },
  });
  revalidatePath("/parametres");
}

export async function updatePreferences(formData: FormData) {
  const companyId = await getCompanyId();
  const raw = Object.fromEntries(formData);

  await prisma.company.update({
    where: { id: companyId },
    data: {
      prefVatRates: (raw.prefVatRates as string) || "6,12,21",
      prefPaymentMethods: (raw.prefPaymentMethods as string) || "VIREMENT",
      prefUnits: (raw.prefUnits as string) || "heure,unité",
      prefCategories: (raw.prefCategories as string) || "Services",
      prefValidityDays: parseInt(raw.prefValidityDays as string) || 30,
      prefShowInternalRef: raw.prefShowInternalRef === "true",
      prefShowClientRef: raw.prefShowClientRef === "true",
      prefShowDelivery: raw.prefShowDelivery === "true",
      prefAutoConditions: raw.prefAutoConditions === "true",
      prefCurrency: (raw.prefCurrency as string) || "EUR",
      prefLanguage: (raw.prefLanguage as string) || "fr-BE",
    },
  });

  revalidatePath("/parametres");
}
