import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createDeal } from "@/actions/deals";
import Link from "next/link";

export default async function NewDealPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;

  const clients = await prisma.client.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <Header title="Nouvelle opportunité" />
      <div className="p-6 max-w-2xl">
        <form action={createDeal} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Opportunité</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input id="title" name="title" required placeholder="ex: Refonte site web" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientId">Client *</Label>
                <select name="clientId" required className="flex h-9 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
                  <option value="">Sélectionner un client</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Valeur estimée (€)</Label>
                  <Input id="value" name="value" type="number" min="0" step="0.01" defaultValue="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="probability">Probabilité %</Label>
                  <Input id="probability" name="probability" type="number" min="0" max="100" defaultValue="20" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage">Étape</Label>
                <select name="stage" className="flex h-9 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
                  <option value="PROSPECTION">Prospection</option>
                  <option value="QUALIFICATION">Qualification</option>
                  <option value="PROPOSITION">Proposition</option>
                  <option value="NEGOCIATION">Négociation</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedAt">Date de clôture prévue</Label>
                <Input id="expectedAt" name="expectedAt" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" placeholder="Contexte, remarques..." rows={3} />
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button type="submit">Créer l&apos;opportunité</Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/deals">Annuler</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
