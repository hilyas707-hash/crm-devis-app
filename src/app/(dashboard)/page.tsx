import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, QUOTE_STATUS_LABELS, INVOICE_STATUS_LABELS } from "@/lib/utils";
import { Users, FileText, Receipt, TrendingUp, Euro, AlertCircle } from "lucide-react";
import Link from "next/link";

async function getDashboardData(companyId: string) {
  const [clients, quotes, invoices, deals] = await Promise.all([
    prisma.client.count({ where: { companyId } }),
    prisma.quote.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: true },
    }),
    prisma.invoice.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: true },
    }),
    prisma.deal.count({ where: { client: { companyId } } }),
  ]);

  const totalRevenue = await prisma.invoice.aggregate({
    where: { companyId, status: "PAID" },
    _sum: { total: true },
  });

  const pendingInvoices = await prisma.invoice.aggregate({
    where: { companyId, status: { in: ["SENT", "PARTIAL"] } },
    _sum: { total: true },
  });

  return {
    clientsCount: clients,
    quotesCount: quotes.length,
    dealsCount: deals,
    totalRevenue: totalRevenue._sum.total || 0,
    pendingAmount: pendingInvoices._sum.total || 0,
    recentQuotes: quotes,
    recentInvoices: invoices,
  };
}

function getQuoteBadgeVariant(status: string) {
  const map: Record<string, "default" | "info" | "success" | "destructive" | "warning" | "purple"> = {
    DRAFT: "secondary" as any,
    SENT: "info",
    ACCEPTED: "success",
    REJECTED: "destructive",
    INVOICED: "purple",
  };
  return map[status] || "secondary" as any;
}

function getInvoiceBadgeVariant(status: string) {
  const map: Record<string, any> = {
    DRAFT: "secondary",
    SENT: "info",
    PARTIAL: "warning",
    PAID: "success",
    OVERDUE: "destructive",
  };
  return map[status] || "secondary";
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;
  if (!companyId) return null;

  const data = await getDashboardData(companyId);

  return (
    <div>
      <Header title="Tableau de bord" />
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">Clients</p>
                  <p className="text-2xl font-bold">{data.clientsCount}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">CA encaissé</p>
                  <p className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <Euro className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">En attente</p>
                  <p className="text-2xl font-bold">{formatCurrency(data.pendingAmount)}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">Opportunités</p>
                  <p className="text-2xl font-bold">{data.dealsCount}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Quotes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Derniers devis</CardTitle>
              <Link href="/devis" className="text-sm text-[var(--primary)] hover:underline">
                Voir tout
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {data.recentQuotes.length === 0 ? (
                  <p className="p-6 text-sm text-[var(--muted-foreground)] text-center">
                    Aucun devis pour l&apos;instant
                  </p>
                ) : (
                  data.recentQuotes.map((q) => (
                    <Link
                      key={q.id}
                      href={`/devis/${q.id}`}
                      className="flex items-center justify-between px-6 py-3 hover:bg-[var(--muted)] transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{q.number}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{q.client.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{formatCurrency(q.total)}</span>
                        <Badge variant={getQuoteBadgeVariant(q.status)}>
                          {QUOTE_STATUS_LABELS[q.status]}
                        </Badge>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Dernières factures</CardTitle>
              <Link href="/factures" className="text-sm text-[var(--primary)] hover:underline">
                Voir tout
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {data.recentInvoices.length === 0 ? (
                  <p className="p-6 text-sm text-[var(--muted-foreground)] text-center">
                    Aucune facture pour l&apos;instant
                  </p>
                ) : (
                  data.recentInvoices.map((inv) => (
                    <Link
                      key={inv.id}
                      href={`/factures/${inv.id}`}
                      className="flex items-center justify-between px-6 py-3 hover:bg-[var(--muted)] transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">{inv.number}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{inv.client.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{formatCurrency(inv.total)}</span>
                        <Badge variant={getInvoiceBadgeVariant(inv.status)}>
                          {INVOICE_STATUS_LABELS[inv.status]}
                        </Badge>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
