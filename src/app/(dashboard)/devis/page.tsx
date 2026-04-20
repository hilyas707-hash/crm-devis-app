import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchFilter } from "@/components/ui/search-filter";
import { formatCurrency, formatDate, QUOTE_STATUS_LABELS } from "@/lib/utils";
import { Plus, FileText, Clock, CheckCircle, XCircle, Send, Receipt, Building2 } from "lucide-react";
import Link from "next/link";
import { ClickableRow } from "@/components/ui/clickable-row";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Brouillon" },
  { value: "SENT", label: "Envoyé" },
  { value: "ACCEPTED", label: "Accepté" },
  { value: "REJECTED", label: "Refusé" },
  { value: "INVOICED", label: "Facturé" },
];

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  DRAFT: { icon: Clock, color: "text-slate-500", bg: "bg-slate-100" },
  SENT: { icon: Send, color: "text-blue-600", bg: "bg-blue-100" },
  ACCEPTED: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100" },
  REJECTED: { icon: XCircle, color: "text-red-500", bg: "bg-red-100" },
  INVOICED: { icon: Receipt, color: "text-violet-600", bg: "bg-violet-100" },
};

const badgeVariant: Record<string, any> = {
  DRAFT: "secondary", SENT: "info", ACCEPTED: "success", REJECTED: "destructive", INVOICED: "purple",
};

export default async function DevisPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; company?: string }>;
}) {
  const { search = "", status = "", company: companyFilter = "" } = await searchParams;
  const session = await getServerSession(authOptions);
  const activeCompanyId = (session?.user as any)?.companyId;
  const userId = (session?.user as any)?.id;

  // Charge toutes les entreprises accessibles
  const [primaryUser, userCompanies] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { companyId: true, company: { select: { id: true, name: true } } } }),
    prisma.userCompany.findMany({ where: { userId }, include: { company: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } }),
  ]);

  const allCompanies: { id: string; name: string }[] = [];
  if (primaryUser?.company) allCompanies.push(primaryUser.company);
  for (const uc of userCompanies) {
    if (!allCompanies.find((c) => c.id === uc.companyId)) allCompanies.push(uc.company);
  }

  // Valide que l'entreprise demandée appartient bien à l'utilisateur (empêche la fuite inter-companies)
  const companyIds = allCompanies.map((c) => c.id);
  const selectedCompanyId = companyIds.includes(companyFilter)
    ? companyFilter
    : (activeCompanyId ?? companyIds[0] ?? "");

  const where: any = { companyId: selectedCompanyId };
  if (status) where.status = status;
  if (search) where.OR = [
    { number: { contains: search, mode: "insensitive" } },
    { title: { contains: search, mode: "insensitive" } },
    { client: { name: { contains: search, mode: "insensitive" } } },
  ];

  const [quotes, stats] = await Promise.all([
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { client: true },
    }),
    prisma.quote.groupBy({
      by: ["status"],
      where: { companyId: selectedCompanyId },
      _count: true,
      _sum: { total: true },
    }),
  ]);

  const totalAmount = quotes.reduce((s, q) => s + q.total, 0);

  return (
    <div>
      <Header title="Devis" />
      <div className="p-4 md:p-6 space-y-5">

        {/* Company selector — visible only if multiple companies */}
        {allCompanies.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {allCompanies.map((c) => {
              const isSelected = c.id === selectedCompanyId;
              const params = new URLSearchParams();
              if (search) params.set("search", search);
              if (status) params.set("status", status);
              params.set("company", c.id);
              return (
                <Link
                  key={c.id}
                  href={`/devis?${params.toString()}`}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                    isSelected
                      ? "bg-blue-500/10 border-blue-500/40 text-blue-400"
                      : "border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  {c.name}
                  {c.id === activeCompanyId && (
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full leading-none">active</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {STATUS_OPTIONS.map((opt) => {
            const stat = stats.find(s => s.status === opt.value);
            const cfg = STATUS_CONFIG[opt.value];
            const Icon = cfg.icon;
            return (
              <Link key={opt.value} href={`/devis?status=${opt.value}`}
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
            <SearchFilter placeholder="Chercher un devis, client…" statusOptions={STATUS_OPTIONS} currentSearch={search} currentStatus={status} />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-[var(--muted-foreground)]">{quotes.length} devis · {formatCurrency(totalAmount)}</span>
            <Button asChild className="shadow-md shadow-blue-500/20">
              <Link href="/devis/new"><Plus className="h-4 w-4" /> Nouveau devis</Link>
            </Button>
          </div>
        </div>

        {/* List */}
        {quotes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--border)] py-16 text-center">
            <FileText className="h-12 w-12 text-[var(--muted-foreground)] mx-auto mb-3 opacity-40" />
            <p className="text-[var(--muted-foreground)] font-medium">Aucun devis trouvé</p>
            {(search || status) && <p className="text-sm text-[var(--muted-foreground)] mt-1">Essayez de modifier vos filtres</p>}
            <Button asChild className="mt-4">
              <Link href="/devis/new"><Plus className="h-4 w-4" /> Créer un devis</Link>
            </Button>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide hidden md:table-cell">Validité</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Montant</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {quotes.map((q) => {
                    const cfg = STATUS_CONFIG[q.status];
                    const Icon = cfg.icon;
                    return (
                      <ClickableRow key={q.id} href={`/devis/${q.id}`} className="hover:bg-[var(--muted)]/40 transition-colors group">
                        <td className="px-5 py-4">
                          <Link href={`/devis/${q.id}`} className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                              <Icon className={`h-4 w-4 ${cfg.color}`} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold group-hover:text-[var(--primary)] transition-colors">{q.number}</p>
                              {q.title && <p className="text-xs text-[var(--muted-foreground)] truncate max-w-[120px]">{q.title}</p>}
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-4">
                          <Link href={`/clients/${q.client.id}`} className="flex items-center gap-2 hover:text-[var(--primary)] transition-colors">
                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shrink-0">
                              <span className="text-white text-[10px] font-bold">{q.client.name.slice(0, 2).toUpperCase()}</span>
                            </div>
                            <span className="text-sm font-medium truncate max-w-[120px]">{q.client.name}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell text-sm text-[var(--muted-foreground)]">{formatDate(q.issueDate)}</td>
                        <td className="px-4 py-4 hidden md:table-cell text-sm text-[var(--muted-foreground)]">{q.validUntil ? formatDate(q.validUntil) : "—"}</td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-sm font-bold">{formatCurrency(q.total)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={badgeVariant[q.status]}>{QUOTE_STATUS_LABELS[q.status]}</Badge>
                        </td>
                      </ClickableRow>
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
