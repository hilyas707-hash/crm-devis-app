import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, CLIENT_STATUS_LABELS, QUOTE_STATUS_LABELS, INVOICE_STATUS_LABELS } from "@/lib/utils";
import { Edit, Plus, Building2, Mail, Phone, MapPin, FileText, Receipt } from "lucide-react";
import Link from "next/link";
import { deleteClient } from "@/actions/clients";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;

  const client = await prisma.client.findFirst({
    where: { id, companyId },
    include: {
      contacts: true,
      quotes: { orderBy: { createdAt: "desc" }, take: 10 },
      invoices: { orderBy: { createdAt: "desc" }, take: 10 },
      deals: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!client) notFound();

  const statusVariant: Record<string, any> = { PROSPECT: "warning", ACTIVE: "success", INACTIVE: "secondary" };

  return (
    <div>
      <Header
        title={client.name}
        backHref="/clients"
        badge={<Badge variant={statusVariant[client.status]}>{CLIENT_STATUS_LABELS[client.status]}</Badge>}
      />
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-[var(--muted-foreground)]">
            {client.type === "COMPANY" ? "Société" : "Particulier"}
            {client.vatNumber && ` · TVA: ${client.vatNumber}`}
          </p>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/devis/new">
                <Plus className="h-4 w-4" />
                Nouveau devis
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/clients/${id}/edit`}>
                <Edit className="h-4 w-4" />
                Modifier
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Infos */}
          <Card>
            <CardHeader><CardTitle className="text-base">Coordonnées</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {client.email && (
                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${client.email}`} className="hover:text-[var(--primary)]">{client.email}</a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                  <Phone className="h-4 w-4" />
                  <span>{client.phone}</span>
                </div>
              )}
              {(client.address || client.city) && (
                <div className="flex items-start gap-2 text-[var(--muted-foreground)]">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <span>{[client.address, client.postalCode, client.city, client.country].filter(Boolean).join(", ")}</span>
                </div>
              )}
              {client.notes && (
                <>
                  <Separator />
                  <p className="text-[var(--muted-foreground)] italic">{client.notes}</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              {client.contacts.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">Aucun contact</p>
              ) : (
                <div className="space-y-3">
                  {client.contacts.map((c) => (
                    <div key={c.id} className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{c.firstName} {c.lastName}</p>
                        {c.position && <p className="text-xs text-[var(--muted-foreground)]">{c.position}</p>}
                        {c.email && <p className="text-xs text-[var(--muted-foreground)]">{c.email}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quotes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Devis ({client.quotes.length})
            </CardTitle>
            <Button size="sm" asChild>
              <Link href="/devis/new"><Plus className="h-3.5 w-3.5" /> Nouveau devis</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.quotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Link href={`/devis/${q.id}`} className="font-medium hover:text-[var(--primary)] hover:underline">
                        {q.number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-[var(--muted-foreground)]">{formatDate(q.issueDate)}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(q.total)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{QUOTE_STATUS_LABELS[q.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Factures ({client.invoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-[var(--muted-foreground)] py-6">Aucune facture</TableCell>
                  </TableRow>
                ) : (
                  client.invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <Link href={`/factures/${inv.id}`} className="font-medium hover:text-[var(--primary)] hover:underline">
                          {inv.number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(inv.issueDate)}</TableCell>
                      <TableCell className="text-sm">{formatDate(inv.dueDate)}</TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(inv.total)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{INVOICE_STATUS_LABELS[inv.status]}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
