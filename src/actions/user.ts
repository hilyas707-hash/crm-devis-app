"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Non authentifié");
  return (session.user as any).id as string;
}

export async function updateUserSmtp(formData: FormData) {
  const userId = await getUserId();
  const raw = Object.fromEntries(formData);

  await prisma.user.update({
    where: { id: userId },
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
