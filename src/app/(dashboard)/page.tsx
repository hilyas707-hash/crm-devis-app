import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, QUOTE_STATUS_LABELS, INVOICE_STATUS_LABELS } from "@/lib/utils";
import { Users, FileText, Receipt, TrendingUp, Euro, AlertCircle, ArrowUpRight, Clock } from "lucide-react";
import Link from "next/link";

async function getDashboardData(companyId: string) {
  const [clients, quotes, invoices, deals, totalRevenue, pendingInvoices] = await Promise.all([
    prisma.client.count({ where: { companyId } }),
    prisma.quote.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, take: 5, include: { client: true } }),
    prisma.invoice.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, take: 5, include: { client: true } }),
    prisma.deal.count({ where: { client: { companyId } } }),
    prisma.invoice.aggregate({ where: { companyId, status: "PAID" }, _sum: { total: true } }),
    prisma.invoice.aggregate({ where: { companyId, status: { in: ["SENT", "PARTIAL"] } }, _sum: { total: true } }),
  ]);

  return {
    clientsCount: clients,
    dealsCount: deals,
    totalRevenue: totalRevenue._sum.total || 0,
    pendingAmount: pendingInvoices._sum.total || 0,
    recentQuotes: quotes,
    recentInvoices: invoices,
  };
}

function getQuoteBadgeVariant(status: string) {
  const map: Record<string, any> = { DRAFT: "secondary", SENT: "info", ACCEPTED: "success", REJECTED: "destructive", INVOICED: "purple" };
  return map[status] || "secondary";
}

function getInvoiceBadgeVariant(status: string) {
  const map: Record<string, any> = { DRAFT: "secondary", SENT: "info", PARTIAL: "warning", PAID: "success", OVERDUE: "destructive" };
  return map[status] || "secondary";
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;
  if (!companyId) return null;

  const data = await getDashboardData(companyId);
  const userName = (session?.user as any)?.name || "vous";

  const stats = [
    {
      label: "CA encaissé",
      value: formatCurrency(data.totalRevenue),
      icon: Euro,
      gradient: "from-blue-500 to-blue-600",
      shadow: "shadow-blue-500/30",
      href: "/factures",
    },
    {
      label: "En attente",
      value: formatCurrency(data.pendingAmount),
      icon: AlertCircle,
      gradient: "from-amber-500 to-orange-500",
      shadow: "shadow-amber-500/30",
      href: "/factures",
    },
    {
      label: "Clients",
      value: data.clientsCount.toString(),
      icon: Users,
      gradient: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/30",
      href: "/clients",
    },
    {
      label: "Opportunités",
      value: data.dealsCount.toString(),
      icon: TrendingUp,
      gradient: "from-violet-500 to-purple-600",
      shadow: "shadow-violet-500/30",
      href: "/deals",
    },
  ];

  return (
    <div>
      <Header title="Tableau de bord" />
      <div className="p-4 md:p-6 space-y-6">

        {/* Greeting */}
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">Bonjour, {userName} 👋</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Voici un aperçu de votre activité commerciale</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.label} href={stat.href}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-5 text-white shadow-lg ${stat.shadow} hover:scale-[1.02] transition-transform`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/70 text-xs font-medium uppercase tracking-wide">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1 leading-none">{stat.value}</p>
                  </div>
                  <div className="bg-white/20 rounded-xl p-2.5">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <ArrowUpRight className="absolute bottom-3 right-3 h-4 w-4 opacity-30" />
              </Link>
            );
          })}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3">
          <Link href="/devis/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20">
            <FileText className="h-4 w-4" />
            Nouveau devis
          </Link>
          <Link href="/factures/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[var(--border)] text-[var(--foreground)] rounded-xl text-sm font-medium hover:bg-[var(--muted)] transition-colors">
            <Receipt className="h-4 w-4" />
            Nouvelle facture
          </Link>
          <Link href="/clients/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[var(--border)] text-[var(--foreground)] rounded-xl text-sm font-medium hover:bg-[var(--muted)] transition-colors">
            <Users className="h-4 w-4" />
            Nouveau client
          </Link>
        </div>

        {/* Recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Quotes */}
          <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-violet-600" />
                </div>
                <span className="font-semibold text-sm">Derniers devis</span>
              </div>
              <Link href="/devis" className="text-xs text-[var(--primary)] font-medium hover:underline flex items-center gap-1">
                Voir tout <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {data.recentQuotes.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <FileText className="h-8 w-8 text-[var(--muted-foreground)] mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-[var(--muted-foreground)]">Aucun devis pour l&apos;instant</p>
                  <Link href="/devis/new" className="text-xs text-[var(--primary)] mt-1 inline-block hover:underline">Créer le premier →</Link>
                </div>
              ) : (
                data.recentQuotes.map((q) => (
                  <Link key={q.id} href={`/devis/${q.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-[var(--muted)] transition-colors group">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold group-hover:text-[var(--primary)] transition-colors truncate">{q.number}</p>
                      <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 mt-0.5">
                        <Users className="h-3 w-3" />{q.client.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-sm font-bold">{formatCurrency(q.total)}</span>
                      <Badge variant={getQuoteBadgeVariant(q.status)}>{QUOTE_STATUS_LABELS[q.status]}</Badge>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Receipt className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <span className="font-semibold text-sm">Dernières factures</span>
              </div>
              <Link href="/factures" className="text-xs text-[var(--primary)] font-medium hover:underline flex items-center gap-1">
                Voir tout <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {data.recentInvoices.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <Receipt className="h-8 w-8 text-[var(--muted-foreground)] mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-[var(--muted-foreground)]">Aucune facture pour l&apos;instant</p>
                </div>
              ) : (
                data.recentInvoices.map((inv) => (
                  <Link key={inv.id} href={`/factures/${inv.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-[var(--muted)] transition-colors group">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold group-hover:text-[var(--primary)] transition-colors truncate">{inv.number}</p>
                      <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 mt-0.5">
                        <Users className="h-3 w-3" />{inv.client.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-sm font-bold">{formatCurrency(inv.total)}</span>
                      <Badge variant={getInvoiceBadgeVariant(inv.status)}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
