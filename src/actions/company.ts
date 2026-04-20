"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Non authentifié");
  return session;
}

async function getCompanyId() {
  const session = await getSession();
  const companyId = (session.user as any).companyId;
  if (!companyId) throw new Error("Pas d'entreprise associée");
  return companyId as string;
}

async function getUserId() {
  const session = await getSession();
  return (session.user as any).id as string;
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

export async function createAdditionalCompany(formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData);

  if (!raw.name) throw new Error("Nom de l'entreprise requis");

  const company = await prisma.company.create({
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

  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId, companyId: company.id } },
    create: { userId, companyId: company.id, role: "OWNER" },
    update: {},
  });

  revalidatePath("/parametres");
  revalidatePath("/");
}

export async function switchActiveCompany(companyId: string) {
  const userId = await getUserId();

  // Vérifie que l'utilisateur est bien membre de cette entreprise
  const membership = await prisma.userCompany.findUnique({
    where: { userId_companyId: { userId, companyId } },
  });

  // Aussi accepter la company principale (companyId sur User)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });

  if (!membership && user?.companyId !== companyId) {
    throw new Error("Accès refusé à cette entreprise");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { activeCompanyId: companyId },
  });

  revalidatePath("/", "layout");
  redirect("/");
}

export async function deleteAdditionalCompany(companyId: string) {
  const userId = await getUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });

  // On ne peut pas supprimer l'entreprise principale
  if (user?.companyId === companyId) {
    throw new Error("Impossible de supprimer l'entreprise principale");
  }

  await prisma.userCompany.delete({
    where: { userId_companyId: { userId, companyId } },
  });

  // Si c'était l'entreprise active, revenir à la principale
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeCompanyId: true },
  });

  if (currentUser?.activeCompanyId === companyId) {
    await prisma.user.update({
      where: { id: userId },
      data: { activeCompanyId: user?.companyId ?? null },
    });
  }

  revalidatePath("/parametres");
  revalidatePath("/", "layout");
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
  await prisma.company.update({ where: { id: companyId }, data: { tplLogo: logoBase64 } });
  revalidatePath("/parametres");
}

export async function removeCompanyLogo() {
  const companyId = await getCompanyId();
  await prisma.company.update({ where: { id: companyId }, data: { tplLogo: null } });
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

export async function updateSmtpConfig(formData: FormData) {
  const companyId = await getCompanyId();
  const raw = Object.fromEntries(formData);

  await prisma.company.update({
    where: { id: companyId },
    data: {
      smtpHost: (raw.smtpHost as string) || null,
      smtpPort: raw.smtpPort ? parseInt(raw.smtpPort as string) : null,
      smtpUser: (raw.smtpUser as string) || null,
      smtpPass: (raw.smtpPass as string) || null,
      smtpSecure: raw.smtpSecure === "true",
      smtpFrom: (raw.smtpFrom as string) || null,
    },
  });

  revalidatePath("/parametres");
}
