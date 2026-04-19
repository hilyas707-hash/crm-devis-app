import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, INVOICE_STATUS_LABELS } from "@/lib/utils";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function FacturesPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;

  const invoices = await prisma.invoice.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: { client: true },
  });

  const badgeVariant: Record<string, any> = {
    DRAFT: "secondary", SENT: "info", PARTIAL: "warning", PAID: "success", OVERDUE: "destructive",
  };

  return (
    <div>
      <Header title="Factures" />
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-[var(--muted-foreground)]">{invoices.length} factures</p>
          <Button asChild>
            <Link href="/factures/new"><Plus className="h-4 w-4" /> Nouvelle facture</Link>
          </Button>
        </div>
        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Total TTC</TableHead>
                <TableHead>Payé</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-[var(--muted-foreground)]">
                    Aucune facture.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link href={`/factures/${inv.id}`} className="font-medium hover:text-[var(--primary)] hover:underline">
                        {inv.number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{inv.client.name}</TableCell>
                    <TableCell className="text-sm text-[var(--muted-foreground)]">{formatDate(inv.issueDate)}</TableCell>
                    <TableCell className="text-sm text-[var(--muted-foreground)]">{inv.dueDate ? formatDate(inv.dueDate) : "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(inv.total)}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(inv.paidAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
