import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, INVOICE_STATUS_LABELS } from "@/lib/utils";
import { Send, CreditCard, FileText, Receipt } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { updateInvoiceStatus, addPayment } from "@/actions/invoices";
import { PaymentModal } from "@/components/factures/payment-modal";
import { InvoicePDFTab } from "@/components/factures/invoice-pdf-tab";

export default async function FactureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;

  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId },
    include: {
      client: true,
      company: true,
      items: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { date: "desc" } },
      quote: true,
    },
  });
  if (!invoice) notFound();

  const badgeVariant: Record<string, any> = {
    DRAFT: "secondary", SENT: "info", PARTIAL: "warning", PAID: "success", OVERDUE: "destructive",
  };

  const remaining = invoice.total - invoice.paidAmount;

  return (
    <div>
      <Header />
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{invoice.number}</h1>
              <Badge variant={badgeVariant[invoice.status]}>{INVOICE_STATUS_LABELS[invoice.status]}</Badge>
            </div>
            {invoice.title && <p className="text-[var(--muted-foreground)]">{invoice.title}</p>}
            {invoice.quote && (
              <p className="text-sm text-[var(--muted-foreground)]">
                Devis: <Link href={`/devis/${invoice.quote.id}`} className="hover:text-[var(--primary)] hover:underline">{invoice.quote.number}</Link>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {invoice.status === "DRAFT" && (
              <form action={updateInvoiceStatus.bind(null, id, "SENT")}>
                <Button type="submit" variant="outline"><Send className="h-4 w-4" /> Marquer envoyée</Button>
              </form>
            )}
            {["SENT", "PARTIAL"].includes(invoice.status) && remaining > 0 && (
              <PaymentModal invoiceId={id} remaining={remaining} action={addPayment} />
            )}
          </div>
        </div>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details"><Receipt className="h-4 w-4 mr-1" />Détails</TabsTrigger>
            <TabsTrigger value="pdf"><FileText className="h-4 w-4 mr-1" />PDF &amp; Email</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Client</p>
                  <Link href={`/clients/${invoice.client.id}`} className="font-medium hover:text-[var(--primary)]">{invoice.client.name}</Link>
                  {invoice.client.address && <p className="text-xs text-[var(--muted-foreground)] mt-1">{invoice.client.address}, {invoice.client.city}</p>}
                  {invoice.client.vatNumber && <p className="text-xs text-[var(--muted-foreground)]">TVA: {invoice.client.vatNumber}</p>}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Dates</p>
                  <p className="font-medium">Émise le {formatDate(invoice.issueDate)}</p>
                  {invoice.dueDate && <p className="text-[var(--muted-foreground)] text-xs mt-1">Échéance: {formatDate(invoice.dueDate)}</p>}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Paiement</p>
                  <p className="font-medium text-green-600">{formatCurrency(invoice.paidAmount)} payé</p>
                  {remaining > 0 && <p className="text-xs text-amber-600 mt-1">Reste: {formatCurrency(remaining)}</p>}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto"><table className="w-full text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b bg-[var(--muted)]/50">
                      <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Description</th>
                      <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">Qté</th>
                      <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">Prix HT</th>
                      <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">TVA</th>
                      <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">{item.description}</td>
                        <td className="px-4 py-3 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right">{item.vatRate}%</td>
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
                        <span>{formatCurrency(invoice.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--muted-foreground)]">TVA</span>
                        <span>{formatCurrency(invoice.vatAmount)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-base">
                        <span>Total TTC</span>
                        <span className="text-[var(--primary)]">{formatCurrency(invoice.total)}</span>
                      </div>
                      {invoice.paidAmount > 0 && (
                        <>
                          <div className="flex justify-between text-green-600">
                            <span>Payé</span>
                            <span>-{formatCurrency(invoice.paidAmount)}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Reste à payer</span>
                            <span className="text-amber-600">{formatCurrency(remaining)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {invoice.payments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Paiements reçus
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {invoice.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--muted-foreground)]">{formatDate(p.date)} · {p.method}</span>
                      {p.reference && <span className="text-xs text-[var(--muted-foreground)]">Réf: {p.reference}</span>}
                      <span className="font-medium text-green-600">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pdf" className="mt-4">
            <InvoicePDFTab
              invoiceId={id}
              invoiceNumber={invoice.number}
              clientEmail={invoice.client.email}
              companyName={invoice.company.name}
              total={invoice.total}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
