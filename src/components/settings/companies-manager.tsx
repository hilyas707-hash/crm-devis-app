"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Plus, Trash2, Star, Loader2 } from "lucide-react";
import { createAdditionalCompany, deleteAdditionalCompany } from "@/actions/company";
import { cn } from "@/lib/utils";

interface CompanyItem {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  isPrimary: boolean;
}

interface CompaniesManagerProps {
  companies: CompanyItem[];
  activeCompanyId: string;
}

export function CompaniesManager({ companies, activeCompanyId }: CompaniesManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createAdditionalCompany(formData);
      setShowForm(false);
    });
  }

  function handleDelete(companyId: string) {
    if (!confirm("Supprimer cette entreprise ? Cette action est irréversible.")) return;
    setDeleteId(companyId);
    startTransition(async () => {
      await deleteAdditionalCompany(companyId);
      setDeleteId(null);
    });
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="space-y-3">
        {companies.map((c) => (
          <Card key={c.id} className={cn(
            "border transition-colors",
            c.id === activeCompanyId && "border-blue-500/40 bg-blue-500/5"
          )}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                c.id === activeCompanyId ? "bg-blue-500/20" : "bg-white/5"
              )}>
                {c.isPrimary
                  ? <Star className="h-4 w-4 text-amber-400" />
                  : <Building2 className={cn("h-4 w-4", c.id === activeCompanyId ? "text-blue-400" : "text-slate-400")} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-white truncate">{c.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {c.isPrimary ? "Entreprise principale" : "Entreprise supplémentaire"}
                  {c.id === activeCompanyId && " · Active"}
                </p>
                {c.email && <p className="text-xs text-slate-500 truncate">{c.email}</p>}
              </div>
              {!c.isPrimary && (
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={pending && deleteId === c.id}
                  className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  {pending && deleteId === c.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />
                  }
                </button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {!showForm ? (
        <Button variant="outline" onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter une entreprise
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nouvelle entreprise</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">Nom *</Label>
                <Input id="new-name" name="name" required placeholder="Ma Société SPRL" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email</Label>
                  <Input id="new-email" name="email" type="email" placeholder="contact@..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-phone">Téléphone</Label>
                  <Input id="new-phone" name="phone" placeholder="+32 ..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-vatNumber">N° TVA</Label>
                  <Input id="new-vatNumber" name="vatNumber" placeholder="BE 0000.000.000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-country">Pays</Label>
                  <Input id="new-country" name="country" defaultValue="Belgique" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={pending} className="gap-2">
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Créer l&apos;entreprise
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
