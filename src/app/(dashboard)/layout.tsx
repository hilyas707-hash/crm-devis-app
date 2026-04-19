import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { SessionProvider } from "@/components/layout/session-provider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen overflow-hidden bg-[var(--muted)]">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <main className="flex-1 overflow-y-auto pb-6">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
