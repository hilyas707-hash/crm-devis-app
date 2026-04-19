import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CLIENT_STATUS_LABELS } from "@/lib/utils";
import { Plus, Building2, User } from "lucide-react";
import Link from "next/link";

export default async function ClientsPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;

  const clients = await prisma.client.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { quotes: true, invoices: true } } },
  });

  const statusVariant: Record<string, any> = {
    PROSPECT: "warning",
    ACTIVE: "success",
    INACTIVE: "secondary",
  };

  return (
    <div>
      <Header title="Clients" />
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-[var(--muted-foreground)]">
            {clients.length} client{clients.length !== 1 ? "s" : ""}
          </p>
          <Button asChild>
            <Link href="/clients/new">
              <Plus className="h-4 w-4" />
              Nouveau client
            </Link>
          </Button>
        </div>

        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Devis</TableHead>
                <TableHead>Factures</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-[var(--muted-foreground)]">
                    Aucun client. Créez votre premier client !
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link href={`/clients/${client.id}`} className="font-medium hover:text-[var(--primary)] hover:underline">
                        {client.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
                        {client.type === "COMPANY" ? <Building2 className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                        {client.type === "COMPANY" ? "Société" : "Particulier"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-[var(--muted-foreground)]">{client.email || "—"}</TableCell>
                    <TableCell className="text-sm text-[var(--muted-foreground)]">{client.city || "—"}</TableCell>
                    <TableCell className="text-sm">{client._count.quotes}</TableCell>
                    <TableCell className="text-sm">{client._count.invoices}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[client.status]}>
                        {CLIENT_STATUS_LABELS[client.status]}
                      </Badge>
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
