"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations/product";

async function getCompanyId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Non authentifié");
  const companyId = (session.user as any).companyId;
  if (!companyId) throw new Error("Pas d'entreprise associée");
  return companyId as string;
}

export async function createProduct(formData: FormData) {
  const companyId = await getCompanyId();
  const raw = Object.fromEntries(formData);
  const data = productSchema.parse({
    ...raw,
    unitPrice: parseFloat(raw.unitPrice as string),
    vatRate: parseFloat(raw.vatRate as string),
  });

  await prisma.product.create({ data: { ...data, companyId } });

  revalidatePath("/produits");
  redirect("/produits");
}

export async function updateProduct(id: string, formData: FormData) {
  const companyId = await getCompanyId();
  const raw = Object.fromEntries(formData);
  const data = productSchema.parse({
    ...raw,
    unitPrice: parseFloat(raw.unitPrice as string),
    vatRate: parseFloat(raw.vatRate as string),
  });

  await prisma.product.update({ where: { id, companyId }, data });

  revalidatePath("/produits");
  redirect("/produits");
}

export async function deleteProduct(id: string) {
  const companyId = await getCompanyId();
  await prisma.product.delete({ where: { id, companyId } });
  revalidatePath("/produits");
}
