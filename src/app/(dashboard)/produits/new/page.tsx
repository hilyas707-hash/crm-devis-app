import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createProduct } from "@/actions/products";
import Link from "next/link";

export default function NewProduitPage() {
  return (
    <div>
      <Header title="Nouveau produit" />
      <div className="p-6 max-w-2xl">
        <form action={createProduct} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Informations produit</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reference">Référence</Label>
                  <Input id="reference" name="reference" placeholder="PROD-001" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Input id="category" name="category" placeholder="Services, Matériel..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nom *</Label>
                <Input id="name" name="name" required placeholder="Nom du produit ou service" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="Description détaillée..." rows={3} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Prix unitaire HT *</Label>
                  <Input id="unitPrice" name="unitPrice" type="number" min="0" step="0.01" required placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unité</Label>
                  <Input id="unit" name="unit" defaultValue="unité" placeholder="unité, heure, m²..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vatRate">TVA %</Label>
                  <Input id="vatRate" name="vatRate" type="number" defaultValue="21" min="0" max="100" />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button type="submit">Créer le produit</Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/produits">Annuler</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
