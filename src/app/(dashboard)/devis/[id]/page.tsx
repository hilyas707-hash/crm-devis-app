import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { QuotePDFTab } from "@/components/devis/quote-pdf-tab";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, QUOTE_STATUS_LABELS } from "@/lib/utils";
import { Edit, Receipt, Send, Check, X, ArrowRight, FileText } from "lucide-react";
import Link from "next/link";
import { updateQuoteStatus, convertQuoteToInvoice } from "@/actions/quotes";

export default async function DevisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;

  const quote = await prisma.quote.findFirst({
    where: { id, companyId },
    include: { client: true, items: { orderBy: { sortOrder: "asc" } }, company: true },
  });
  if (!quote) notFound();

  const badgeVariant: Record<string, any> = {
    DRAFT: "secondary", SENT: "info", ACCEPTED: "success", REJECTED: "destructive", INVOICED: "purple",
  };

  const canEdit = quote.status === "DRAFT";
  const canSend = quote.status === "DRAFT";
  const canAccept = quote.status === "SENT";
  const canReject = quote.status === "SENT";
  const canInvoice = quote.status === "ACCEPTED";

  return (
    <div>
      <Header />
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{quote.number}</h1>
              <Badge variant={badgeVariant[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Badge>
            </div>
            {quote.title && <p className="text-[var(--muted-foreground)]">{quote.title}</p>}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {canEdit && (
              <Button variant="outline" asChild>
                <Link href={`/devis/${id}/edit`}><Edit className="h-4 w-4" /> Modifier</Link>
              </Button>
            )}
            {canSend && (
              <form action={updateQuoteStatus.bind(null, id, "SENT")}>
                <Button type="submit" variant="outline">
                  <Send className="h-4 w-4" /> Marquer envoyé
                </Button>
              </form>
            )}
            {canAccept && (
              <form action={updateQuoteStatus.bind(null, id, "ACCEPTED")}>
                <Button type="submit" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
                  <Check className="h-4 w-4" /> Accepté
                </Button>
              </form>
            )}
            {canReject && (
              <form action={updateQuoteStatus.bind(null, id, "REJECTED")}>
                <Button type="submit" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
                  <X className="h-4 w-4" /> Refusé
                </Button>
              </form>
            )}
            {canInvoice && (
              <form action={convertQuoteToInvoice.bind(null, id)}>
                <Button type="submit">
                  <ArrowRight className="h-4 w-4" /> Convertir en facture
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">
              <Receipt className="h-4 w-4 mr-1" />
              Détails
            </TabsTrigger>
            <TabsTrigger value="pdf">
              <FileText className="h-4 w-4 mr-1" />
              PDF &amp; Email
            </TabsTrigger>
          </TabsList>

          {/* Tab Détails */}
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Client</p>
                  <Link href={`/clients/${quote.client.id}`} className="font-medium hover:text-[var(--primary)]">
                    {quote.client.name}
                  </Link>
                  {quote.client.address && <p className="text-xs text-[var(--muted-foreground)] mt-1">{quote.client.address}, {quote.client.city}</p>}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Date d&apos;émission</p>
                  <p className="font-medium">{formatDate(quote.issueDate)}</p>
                  {quote.validUntil && (
                    <>
                      <p className="text-xs text-[var(--muted-foreground)] mt-2 mb-1">Valable jusqu&apos;au</p>
                      <p className="font-medium">{formatDate(quote.validUntil)}</p>
                    </>
                  )}
                  {quote.clientRef && (
                    <>
                      <p className="text-xs text-[var(--muted-foreground)] mt-2 mb-1">Réf. client</p>
                      <p className="font-medium">{quote.clientRef}</p>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Émetteur</p>
                  <p className="font-medium">{quote.company.name}</p>
                  {quote.company.vatNumber && <p className="text-xs text-[var(--muted-foreground)]">TVA: {quote.company.vatNumber}</p>}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto"><table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b bg-[var(--muted)]/50">
                      <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Description</th>
                      <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">Qté</th>
                      <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Unité</th>
                      <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">Prix HT</th>
                      <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">TVA</th>
                      <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">Rem.</th>
                      <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {quote.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{item.description}</p>
                          {item.notes && <p className="text-xs text-[var(--muted-foreground)] mt-0.5 italic">{item.notes}</p>}
                        </td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{item.unit}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right">{item.vatRate}%</td>
                        <td className="px-4 py-3 text-right">{item.discount > 0 ? `${item.discount}%` : "—"}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
                <div className="px-4 py-4 border-t">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--muted-foreground)]">Sous-total HT</span>
                        <span>{formatCurrency(quote.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--muted-foreground)]">TVA</span>
                        <span>{formatCurrency(quote.vatAmount)}</span>
                      </div>
                      {quote.discount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Remise</span>
                          <span>-{formatCurrency(quote.discount)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-base">
                        <span>Total TTC</span>
                        <span className="text-[var(--primary)]">{formatCurrency(quote.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {(quote.notes || quote.conditions) && (
              <div className="grid grid-cols-2 gap-4">
                {quote.notes && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-[var(--muted-foreground)]">{quote.notes}</p></CardContent>
                  </Card>
                )}
                {quote.conditions && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Conditions</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-[var(--muted-foreground)]">{quote.conditions}</p></CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Tab PDF & Email */}
          <TabsContent value="pdf" className="mt-4">
            <QuotePDFTab
              quoteId={id}
              quoteNumber={quote.number}
              clientEmail={quote.client.email}
              companyName={quote.company.name}
              total={quote.total}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
