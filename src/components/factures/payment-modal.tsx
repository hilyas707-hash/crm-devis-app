"use client";

import { useState, useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

interface PaymentModalProps {
  invoiceId: string;
  remaining: number;
  action: (invoiceId: string, data: any) => Promise<void>;
}

export function PaymentModal({ invoiceId, remaining, action }: PaymentModalProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState("VIREMENT");
  const today = new Date().toISOString().split("T")[0];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      amount: parseFloat(fd.get("amount") as string),
      method,
      reference: (fd.get("reference") as string) || undefined,
      date: fd.get("date") as string,
      notes: (fd.get("notes") as string) || undefined,
    };
    startTransition(async () => {
      await action(invoiceId, data);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CreditCard className="h-4 w-4" /> Enregistrer un paiement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Montant *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              max={remaining}
              defaultValue={remaining}
              required
            />
            <p className="text-xs text-[var(--muted-foreground)]">Reste à payer : {formatCurrency(remaining)}</p>
          </div>
          <div className="space-y-2">
            <Label>Mode de paiement</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="VIREMENT">Virement bancaire</SelectItem>
                <SelectItem value="CHEQUE">Chèque</SelectItem>
                <SelectItem value="ESPECES">Espèces</SelectItem>
                <SelectItem value="CARTE">Carte bancaire</SelectItem>
                <SelectItem value="AUTRE">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input id="date" name="date" type="date" defaultValue={today} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Référence</Label>
            <Input id="reference" name="reference" placeholder="ex: VIR-2026-001" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmer
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
