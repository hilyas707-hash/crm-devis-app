import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchFilter } from "@/components/ui/search-filter";
import { CLIENT_STATUS_LABELS } from "@/lib/utils";
import { Plus, Building2, User, Phone, Mail, FileText, Receipt } from "lucide-react";
import Link from "next/link";

const STATUS_OPTIONS = [
  { value: "PROSPECT", label: "Prospect" },
  { value: "ACTIVE", label: "Actif" },
  { value: "INACTIVE", label: "Inactif" },
];

const statusVariant: Record<string, any> = { PROSPECT: "warning", ACTIVE: "success", INACTIVE: "secondary" };
const statusColor: Record<string, string> = {
  PROSPECT: "from-amber-400 to-orange-500",
  ACTIVE: "from-emerald-400 to-teal-500",
  INACTIVE: "from-slate-400 to-slate-500",
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const { search = "", status = "" } = await searchParams;
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;

  const where: any = { companyId };
  if (status) where.status = status;
  if (search) where.OR = [
    { name: { contains: search, mode: "insensitive" } },
    { email: { contains: search, mode: "insensitive" } },
    { city: { contains: search, mode: "insensitive" } },
    { vatNumber: { contains: search, mode: "insensitive" } },
  ];

  const clients = await prisma.client.findMany({
    where,
    orderBy: { name: "asc" },
    include: { _count: { select: { quotes: true, invoices: true } } },
  });

  return (
    <div>
      <Header title="Clients" />
      <div className="p-4 md:p-6 space-y-5">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex-1 w-full sm:max-w-md">
            <SearchFilter placeholder="Chercher un client, email, ville…" statusOptions={STATUS_OPTIONS} currentSearch={search} currentStatus={status} />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-[var(--muted-foreground)]">{clients.length} client{clients.length !== 1 ? "s" : ""}</span>
            <Button asChild className="shadow-md shadow-blue-500/20">
              <Link href="/clients/new"><Plus className="h-4 w-4" /> Nouveau client</Link>
            </Button>
          </div>
        </div>

        {/* Grid cards */}
        {clients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--border)] py-16 text-center">
            <Users className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-3 opacity-40" />
            <p className="text-[var(--muted-foreground)] font-medium">Aucun client trouvé</p>
            <Button asChild className="mt-4">
              <Link href="/clients/new"><Plus className="h-4 w-4" /> Ajouter un client</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clients.map((client) => (
              <Link key={client.id} href={`/clients/${client.id}`}
                className="bg-white rounded-2xl border border-[var(--border)] p-5 hover:border-[var(--primary)] hover:shadow-lg hover:shadow-blue-500/5 transition-all group">
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${statusColor[client.status]} flex items-center justify-center shrink-0 shadow-lg`}>
                    {client.type === "COMPANY"
                      ? <Building2 className="h-6 w-6 text-white" />
                      : <User className="h-6 w-6 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm group-hover:text-[var(--primary)] transition-colors truncate">{client.name}</p>
                      <Badge variant={statusVariant[client.status]} className="shrink-0">{CLIENT_STATUS_LABELS[client.status]}</Badge>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {client.type === "COMPANY" ? "Société" : "Particulier"}
                      {client.city && ` · ${client.city}`}
                    </p>
                    <div className="mt-3 space-y-1">
                      {client.email && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                          <Mail className="h-3 w-3" /> <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                          <Phone className="h-3 w-3" /> {client.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--border)] flex gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                    <FileText className="h-3.5 w-3.5" />
                    <span><strong className="text-[var(--foreground)]">{client._count.quotes}</strong> devis</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                    <Receipt className="h-3.5 w-3.5" />
                    <span><strong className="text-[var(--foreground)]">{client._count.invoices}</strong> factures</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}
