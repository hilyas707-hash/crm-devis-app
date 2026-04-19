"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useTransition, useState } from "react";
import Link from "next/link";

interface ClientData {
  id?: string;
  type?: string;
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  vatNumber?: string;
  notes?: string;
  status?: string;
}

interface ClientFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: ClientData;
  cancelHref?: string;
}

export function ClientForm({ action, defaultValues, cancelHref = "/clients" }: ClientFormProps) {
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState(defaultValues?.type || "COMPANY");
  const [status, setStatus] = useState(defaultValues?.status || "PROSPECT");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("type", type);
    formData.set("status", status);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPANY">Société</SelectItem>
                  <SelectItem value="INDIVIDUAL">Particulier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROSPECT">Prospect</SelectItem>
                  <SelectItem value="ACTIVE">Actif</SelectItem>
                  <SelectItem value="INACTIVE">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input id="name" name="name" defaultValue={defaultValues?.name} required placeholder={type === "COMPANY" ? "Nom de la société" : "Prénom Nom"} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={defaultValues?.email || ""} placeholder="contact@exemple.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" name="phone" defaultValue={defaultValues?.phone || ""} placeholder="+32 2 000 00 00" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile</Label>
            <Input id="mobile" name="mobile" defaultValue={defaultValues?.mobile || ""} placeholder="+32 470 00 00 00" />
          </div>

          {type === "COMPANY" && (
            <div className="space-y-2">
              <Label htmlFor="vatNumber">Numéro de TVA</Label>
              <Input id="vatNumber" name="vatNumber" defaultValue={defaultValues?.vatNumber || ""} placeholder="BE 0000.000.000" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Adresse</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Rue et numéro</Label>
            <Input id="address" name="address" defaultValue={defaultValues?.address || ""} placeholder="Rue de la Loi 1" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Code postal</Label>
              <Input id="postalCode" name="postalCode" defaultValue={defaultValues?.postalCode || ""} placeholder="1000" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input id="city" name="city" defaultValue={defaultValues?.city || ""} placeholder="Bruxelles" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Pays</Label>
            <Input id="country" name="country" defaultValue={defaultValues?.country || "Belgique"} placeholder="Belgique" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea id="notes" name="notes" defaultValue={defaultValues?.notes || ""} placeholder="Notes internes..." rows={3} />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {defaultValues?.id ? "Enregistrer" : "Créer le client"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
