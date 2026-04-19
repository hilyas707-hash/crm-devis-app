import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, QUOTE_STATUS_LABELS } from "@/lib/utils";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function DevisPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;

  const quotes = await prisma.quote.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: { client: true },
  });

  const badgeVariant: Record<string, any> = {
    DRAFT: "secondary",
    SENT: "info",
    ACCEPTED: "success",
    REJECTED: "destructive",
    INVOICED: "purple",
  };

  return (
    <div>
      <Header title="Devis" />
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-[var(--muted-foreground)]">{quotes.length} devis</p>
          <Button asChild>
            <Link href="/devis/new"><Plus className="h-4 w-4" /> Nouveau devis</Link>
          </Button>
        </div>

        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Validité</TableHead>
                <TableHead>Total TTC</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-[var(--muted-foreground)]">
                    Aucun devis. Créez votre premier devis !
                  </TableCell>
                </TableRow>
              ) : (
                quotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Link href={`/devis/${q.id}`} className="font-medium hover:text-[var(--primary)] hover:underline">
                        {q.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/clients/${q.client.id}`} className="text-sm hover:text-[var(--primary)] hover:underline">
                        {q.client.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-[var(--muted-foreground)]">{formatDate(q.issueDate)}</TableCell>
                    <TableCell className="text-sm text-[var(--muted-foreground)]">{q.validUntil ? formatDate(q.validUntil) : "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(q.total)}</TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant[q.status]}>{QUOTE_STATUS_LABELS[q.status]}</Badge>
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
