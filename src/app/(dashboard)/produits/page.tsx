import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Plus, Edit } from "lucide-react";
import Link from "next/link";

export default async function ProduitsPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;

  const products = await prisma.product.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <Header title="Catalogue produits" />
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-[var(--muted-foreground)]">{products.length} produit{products.length !== 1 ? "s" : ""}</p>
          <Button asChild>
            <Link href="/produits/new"><Plus className="h-4 w-4" /> Nouveau produit</Link>
          </Button>
        </div>
        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead>Prix HT</TableHead>
                <TableHead>TVA</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-[var(--muted-foreground)]">
                    Aucun produit dans le catalogue.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm text-[var(--muted-foreground)]">{p.reference || "—"}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm text-[var(--muted-foreground)]">{p.category || "—"}</TableCell>
                    <TableCell className="text-sm">{p.unit}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(p.unitPrice)}</TableCell>
                    <TableCell className="text-sm">{p.vatRate}%</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/produits/${p.id}/edit`}><Edit className="h-4 w-4" /></Link>
                      </Button>
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
