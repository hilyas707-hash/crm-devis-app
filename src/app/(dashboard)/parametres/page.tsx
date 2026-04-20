import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { updateCompany } from "@/actions/company";
import { QuoteTemplateManager } from "@/components/settings/quote-template-manager";
import { SmtpConfig } from "@/components/settings/smtp-config";
import { redirect } from "next/navigation";
import { Building2, LayoutTemplate, Mail } from "lucide-react";

export default async function ParametresPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;
  const userId = (session?.user as any)?.id;

  const [company, templates, currentUser] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: {
      id: true, name: true, email: true, phone: true, address: true, city: true,
      postalCode: true, country: true, vatNumber: true, website: true, iban: true, bic: true,
      quotePrefix: true, invoicePrefix: true, nextQuoteNumber: true, nextInvoiceNumber: true,
    }}),
    prisma.quoteTemplate.findMany({
      where: { companyId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
    prisma.user.findUnique({ where: { id: userId }, select: {
      emailMode: true, smtpHost: true, smtpPort: true, smtpUser: true, smtpPass: true, smtpSecure: true, smtpFrom: true,
    }}),
  ]);

  if (!company) redirect("/login");

  return (
    <div>
      <Header title="Paramètres" />
      <div className="p-4 md:p-6 max-w-5xl">
        <Tabs defaultValue="entreprise">
          <TabsList className="mb-6">
            <TabsTrigger value="entreprise">
              <Building2 className="h-4 w-4 mr-1" />
              Entreprise
            </TabsTrigger>
            <TabsTrigger value="editeur">
              <LayoutTemplate className="h-4 w-4 mr-1" />
              Éditeur de devis
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-1" />
              Email
            </TabsTrigger>
          </TabsList>

          {/* ── Onglet Entreprise ── */}
          <TabsContent value="entreprise">
            <form action={updateCompany} className="space-y-6 max-w-2xl">
              <Card>
                <CardHeader><CardTitle>Informations de l&apos;entreprise</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom de l&apos;entreprise *</Label>
                    <Input id="name" name="name" defaultValue={company.name} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" defaultValue={company.email || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input id="phone" name="phone" defaultValue={company.phone || ""} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vatNumber">Numéro de TVA</Label>
                    <Input id="vatNumber" name="vatNumber" defaultValue={company.vatNumber || ""} placeholder="BE 0000.000.000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Site web</Label>
                    <Input id="website" name="website" defaultValue={company.website || ""} placeholder="https://..." />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Adresse</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input id="address" name="address" defaultValue={company.address || ""} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Code postal</Label>
                      <Input id="postalCode" name="postalCode" defaultValue={company.postalCode || ""} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="city">Ville</Label>
                      <Input id="city" name="city" defaultValue={company.city || ""} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Pays</Label>
                    <Input id="country" name="country" defaultValue={company.country || "Belgique"} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Coordonnées bancaires</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="iban">IBAN</Label>
                    <Input id="iban" name="iban" defaultValue={company.iban || ""} placeholder="BE00 0000 0000 0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bic">BIC / SWIFT</Label>
                    <Input id="bic" name="bic" defaultValue={company.bic || ""} placeholder="GEBABEBB" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Numérotation</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quotePrefix">Préfixe devis</Label>
                      <Input id="quotePrefix" name="quotePrefix" defaultValue={company.quotePrefix} placeholder="DEV" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoicePrefix">Préfixe factures</Label>
                      <Input id="invoicePrefix" name="invoicePrefix" defaultValue={company.invoicePrefix} placeholder="FAC" />
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Prochain devis : {company.quotePrefix}-{String(company.nextQuoteNumber).padStart(3, "0")} ·
                    Prochaine facture : {company.invoicePrefix}-{String(company.nextInvoiceNumber).padStart(3, "0")}
                  </p>
                </CardContent>
              </Card>

              <Button type="submit">Enregistrer les paramètres</Button>
            </form>
          </TabsContent>

          {/* ── Onglet Email ── */}
          <TabsContent value="email">
            <SmtpConfig initial={{
              emailMode: currentUser?.emailMode ?? "SMTP",
              smtpHost: currentUser?.smtpHost ?? null,
              smtpPort: currentUser?.smtpPort ?? null,
              smtpUser: currentUser?.smtpUser ?? null,
              smtpPass: currentUser?.smtpPass ?? null,
              smtpSecure: currentUser?.smtpSecure ?? false,
              smtpFrom: currentUser?.smtpFrom ?? null,
            }} />
          </TabsContent>

          {/* ── Onglet Éditeur de devis ── */}
          <TabsContent value="editeur">
            <QuoteTemplateManager
              initialTemplates={templates.map((t) => ({
                id: t.id,
                name: t.name,
                isDefault: t.isDefault,
                color: t.color,
                font: t.font,
                logo: t.logo,
                footer: t.footer ?? "",
                showBank: t.showBank,
                conditions: t.conditions ?? "",
                autoConditions: t.autoConditions,
                vatRates: t.vatRates,
                paymentMethods: t.paymentMethods,
                units: t.units,
                categories: t.categories,
                validityDays: t.validityDays,
                showInternalRef: t.showInternalRef,
                showClientRef: t.showClientRef,
                showDelivery: t.showDelivery,
                currency: t.currency,
                language: t.language,
              }))}
              companyName={company.name}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
