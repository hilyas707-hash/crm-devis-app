import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProduct } from "@/actions/products";
import Link from "next/link";

export default async function EditProduitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;

  const product = await prisma.product.findFirst({ where: { id, companyId } });
  if (!product) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateProduct(id, formData);
  }

  return (
    <div>
      <Header title={`Modifier — ${product.name}`} />
      <div className="p-6 max-w-2xl">
        <form action={handleUpdate} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Informations produit</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reference">Référence</Label>
                  <Input id="reference" name="reference" defaultValue={product.reference || ""} placeholder="PROD-001" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Input id="category" name="category" defaultValue={product.category || ""} placeholder="Services, Matériel..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nom *</Label>
                <Input id="name" name="name" defaultValue={product.name} required placeholder="Nom du produit ou service" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={product.description || ""} placeholder="Description détaillée..." rows={3} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Prix unitaire HT *</Label>
                  <Input id="unitPrice" name="unitPrice" type="number" min="0" step="0.01" defaultValue={product.unitPrice} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unité</Label>
                  <Input id="unit" name="unit" defaultValue={product.unit} placeholder="unité, heure, m²..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vatRate">TVA %</Label>
                  <Input id="vatRate" name="vatRate" type="number" defaultValue={product.vatRate} min="0" max="100" />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button type="submit">Enregistrer</Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/produits">Annuler</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
