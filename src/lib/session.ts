import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Non authentifié");
  return session;
}

export async function requireCompanyId(): Promise<string> {
  const session = await requireSession();
  const companyId = (session.user as any).companyId as string | undefined;
  if (!companyId) throw new Error("Pas d'entreprise associée");
  return companyId;
}

export async function requireUserId(): Promise<string> {
  const session = await requireSession();
  const id = (session.user as any).id as string | undefined;
  if (!id) throw new Error("Utilisateur introuvable");
  return id;
}
