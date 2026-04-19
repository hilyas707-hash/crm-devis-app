import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchFilter } from "@/components/ui/search-filter";
import { formatCurrency, formatDate, INVOICE_STATUS_LABELS } from "@/lib/utils";
import { Plus, Receipt, Clock, Send, AlertCircle, CheckCircle, CreditCard } from "lucide-react";
import Link from "next/link";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Brouillon" },
  { value: "SENT", label: "Envoyée" },
  { value: "PARTIAL", label: "Partiel" },
  { value: "PAID", label: "Payée" },
  { value: "OVERDUE", label: "En retard" },
];

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  DRAFT: { icon: Clock, color: "text-slate-500", bg: "bg-slate-100" },
  SENT: { icon: Send, color: "text-blue-600", bg: "bg-blue-100" },
  PARTIAL: { icon: CreditCard, color: "text-amber-600", bg: "bg-amber-100" },
  PAID: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100" },
  OVERDUE: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-100" },
};

const badgeVariant: Record<string, any> = {
  DRAFT: "secondary", SENT: "info", PARTIAL: "warning", PAID: "success", OVERDUE: "destructive",
};

export default async function FacturesPage({
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
    { number: { contains: search, mode: "insensitive" } },
    { title: { contains: search, mode: "insensitive" } },
    { client: { name: { contains: search, mode: "insensitive" } } },
  ];

  const [invoices, stats] = await Promise.all([
    prisma.invoice.findMany({ where, orderBy: { createdAt: "desc" }, include: { client: true } }),
    prisma.invoice.groupBy({ by: ["status"], where: { companyId }, _count: true, _sum: { total: true } }),
  ]);

  const totalAmount = invoices.reduce((s, i) => s + i.total, 0);
  const paidAmount = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + i.total, 0);

  return (
    <div>
      <Header title="Factures" />
      <div className="p-4 md:p-6 space-y-5">

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {STATUS_OPTIONS.map((opt) => {
            const stat = stats.find(s => s.status === opt.value);
            const cfg = STATUS_CONFIG[opt.value];
            const Icon = cfg.icon;
            return (
              <Link key={opt.value} href={`/factures?status=${opt.value}`}
                className={`bg-white rounded-xl border border-[var(--border)] p-3 hover:border-[var(--primary)] transition-all ${status === opt.value ? "ring-2 ring-[var(--primary)] border-[var(--primary)]" : ""}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`h-6 w-6 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                    <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)] font-medium">{opt.label}</span>
                </div>
                <p className="text-lg font-bold">{stat?._count ?? 0}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{formatCurrency(stat?._sum.total ?? 0)}</p>
              </Link>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex-1 w-full sm:max-w-md">
            <SearchFilter placeholder="Chercher une facture, client…" statusOptions={STATUS_OPTIONS} currentSearch={search} currentStatus={status} />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-[var(--muted-foreground)]">{invoices.length} · {formatCurrency(totalAmount)}</span>
            <Button asChild className="shadow-md shadow-blue-500/20">
              <Link href="/factures/new"><Plus className="h-4 w-4" /> Nouvelle facture</Link>
            </Button>
          </div>
        </div>

        {/* List */}
        {invoices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--border)] py-16 text-center">
            <Receipt className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-3 opacity-40" />
            <p className="text-[var(--muted-foreground)] font-medium">Aucune facture trouvée</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/60">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Numéro</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide hidden md:table-cell">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide hidden md:table-cell">Échéance</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Montant</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide hidden sm:table-cell">Payé</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {invoices.map((inv) => {
                    const cfg = STATUS_CONFIG[inv.status];
                    const Icon = cfg.icon;
                    const isOverdue = inv.status !== "PAID" && inv.dueDate && new Date(inv.dueDate) < new Date();
                    return (
                      <tr key={inv.id} className="hover:bg-[var(--muted)]/40 transition-colors group">
                        <td className="px-5 py-4">
                          <Link href={`/factures/${inv.id}`} className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                              <Icon className={`h-4 w-4 ${cfg.color}`} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold group-hover:text-[var(--primary)] transition-colors">{inv.number}</p>
                              {inv.title && <p className="text-xs text-[var(--muted-foreground)] truncate max-w-[100px]">{inv.title}</p>}
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-4">
                          <Link href={`/clients/${inv.client.id}`} className="flex items-center gap-2 hover:text-[var(--primary)] transition-colors">
                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                              <span className="text-white text-[10px] font-bold">{inv.client.name.slice(0, 2).toUpperCase()}</span>
                            </div>
                            <span className="text-sm font-medium truncate max-w-[120px]">{inv.client.name}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell text-sm text-[var(--muted-foreground)]">{formatDate(inv.issueDate)}</td>
                        <td className="px-4 py-4 hidden md:table-cell text-sm">
                          {inv.dueDate ? (
                            <span className={isOverdue ? "text-red-600 font-medium" : "text-[var(--muted-foreground)]"}>
                              {formatDate(inv.dueDate)}
                              {isOverdue && " ⚠️"}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-sm">{formatCurrency(inv.total)}</td>
                        <td className="px-4 py-4 text-right hidden sm:table-cell text-sm text-emerald-600 font-medium">{formatCurrency(inv.paidAmount)}</td>
                        <td className="px-4 py-4">
                          <Badge variant={badgeVariant[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
