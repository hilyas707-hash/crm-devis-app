import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { SessionProvider } from "@/components/layout/session-provider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const userId = (session.user as any)?.id;
  const activeCompanyId = (session.user as any)?.companyId;

  // Charge toutes les entreprises de l'utilisateur
  const [primaryUser, userCompanies] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, company: { select: { id: true, name: true } } },
    }),
    prisma.userCompany.findMany({
      where: { userId },
      include: { company: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Compile la liste complète des entreprises accessibles
  const companies: { id: string; name: string }[] = [];

  if (primaryUser?.company) {
    companies.push({ id: primaryUser.company.id, name: primaryUser.company.name });
  }

  for (const uc of userCompanies) {
    if (!companies.find((c) => c.id === uc.companyId)) {
      companies.push({ id: uc.companyId, name: uc.company.name });
    }
  }

  const activeCompany = companies.find((c) => c.id === activeCompanyId) ?? companies[0];

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen overflow-hidden bg-white">
        <Sidebar
          companies={companies}
          activeCompanyId={activeCompany?.id ?? ""}
          activeCompanyName={activeCompany?.name ?? "Mon entreprise"}
        />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <main className="flex-1 overflow-y-auto pb-6">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
