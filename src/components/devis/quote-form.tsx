"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus, Loader2, LayoutTemplate, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface Client { id: string; name: string }
interface Product { id: string; name: string; unitPrice: number; vatRate: number; description?: string | null; unit: string }
interface TemplateSummary {
  id: string; name: string; isDefault: boolean; color: string; font: string;
  validityDays: number; conditions: string | null; autoConditions: boolean;
  vatRates: string; units: string; categories: string; currency: string;
}

interface Item {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discount: number;
  productId?: string;
  sortOrder: number;
}

interface QuoteFormProps {
  clients: Client[];
  products: Product[];
  templates?: TemplateSummary[];
  action: (data: any) => Promise<void>;
  defaultValues?: {
    title?: string;
    clientId?: string;
    issueDate?: string;
    validUntil?: string;
    notes?: string;
    conditions?: string;
    discount?: number;
    discountType?: "PERCENT" | "FIXED";
    items?: Item[];
    templateId?: string;
  };
  cancelHref?: string;
}

function calcItemTotal(item: Item) {
  return item.quantity * item.unitPrice * (1 - item.discount / 100) * (1 + item.vatRate / 100);
}

export function QuoteForm({ clients, products, templates = [], action, defaultValues, cancelHref = "/devis" }: QuoteFormProps) {
  const defaultTpl = templates.find(t => t.isDefault) ?? templates[0] ?? null;
  const [pending, startTransition] = useTransition();
  const [clientId, setClientId] = useState(defaultValues?.clientId || "");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">(defaultValues?.discountType || "PERCENT");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSummary | null>(
    defaultValues?.templateId
      ? (templates.find(t => t.id === defaultValues.templateId) ?? defaultTpl)
      : defaultTpl
  );
  const [items, setItems] = useState<Item[]>(
    defaultValues?.items || [{ description: "", quantity: 1, unitPrice: 0, vatRate: 21, discount: 0, sortOrder: 0 }]
  );

  function applyTemplate(tpl: TemplateSummary) {
    setSelectedTemplate(tpl);
  }

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unitPrice: 0, vatRate: 21, discount: 0, sortOrder: prev.length },
    ]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof Item, value: any) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const selectProduct = (idx: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setItems((prev) =>
        prev.map((item, i) =>
          i === idx
            ? { ...item, productId, description: product.name, unitPrice: product.unitPrice, vatRate: product.vatRate }
            : item
        )
      );
    }
  };

  const subtotal = items.reduce((s, item) => s + item.quantity * item.unitPrice * (1 - item.discount / 100), 0);
  const vatAmount = items.reduce((s, item) => s + item.quantity * item.unitPrice * (1 - item.discount / 100) * (item.vatRate / 100), 0);
  const discount = parseFloat((document.getElementById("discount") as HTMLInputElement)?.value || "0") || 0;
  const discountAmount = discountType === "PERCENT" ? (subtotal * discount) / 100 : discount;
  const total = subtotal + vatAmount - discountAmount;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      title: fd.get("title") as string,
      clientId,
      issueDate: fd.get("issueDate") as string,
      validUntil: (fd.get("validUntil") as string) || undefined,
      notes: (fd.get("notes") as string) || undefined,
      conditions: (fd.get("conditions") as string) || undefined,
      discount: parseFloat((fd.get("discount") as string) || "0") || 0,
      discountType,
      templateId: selectedTemplate?.id || undefined,
      items: items.map((item, i) => ({ ...item, sortOrder: i })),
    };
    startTransition(() => action(data));
  }

  const today = new Date().toISOString().split("T")[0];
  const validUntilDefault = defaultValues?.validUntil || (() => {
    const d = new Date();
    const days = selectedTemplate?.validityDays ?? 30;
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  })();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Sélecteur de template ── */}
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutTemplate className="h-4 w-4 text-[var(--primary)]" />
              Template du devis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {templates.map((tpl) => {
                const active = selectedTemplate?.id === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className={`relative flex flex-col rounded-xl border-2 overflow-hidden transition-all w-36 text-left shrink-0 ${
                      active ? "border-[var(--primary)] shadow-md" : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                    }`}
                  >
                    {/* Bande couleur */}
                    <div className="h-8 w-full flex items-center px-2 gap-1.5" style={{ backgroundColor: tpl.color }}>
                      <span className="text-white text-xs font-bold opacity-80" style={{
                        fontFamily: tpl.font === "Times-Roman" ? "Georgia, serif" : tpl.font === "Courier" ? "monospace" : "sans-serif"
                      }}>DEV</span>
                      <span className="text-white text-[10px] opacity-60 ml-auto">{tpl.currency}</span>
                    </div>
                    {/* Info */}
                    <div className="p-2 bg-[var(--background)]">
                      <div className="flex items-start gap-1">
                        <span className="text-xs font-semibold leading-tight flex-1">{tpl.name}</span>
                        {tpl.isDefault && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0 mt-0.5" />}
                      </div>
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                        {tpl.vatRates.split(",").map(r => `${r}%`).join(", ")} · {tpl.validityDays}j
                      </p>
                    </div>
                    {active && (
                      <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-white flex items-center justify-center shadow">
                        <Check className="h-3 w-3" style={{ color: tpl.color }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedTemplate && (
              <p className="text-xs text-[var(--muted-foreground)] mt-3">
                Template <strong>{selectedTemplate.name}</strong> — validité {selectedTemplate.validityDays} jours
                {selectedTemplate.autoConditions && selectedTemplate.conditions
                  ? " · conditions de vente pré-remplies"
                  : ""}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre / Objet</Label>
            <Input id="title" name="title" defaultValue={defaultValues?.title || ""} placeholder="ex: Développement site web" />
          </div>
          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={clientId} onValueChange={setClientId} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Date d&apos;émission *</Label>
              <Input id="issueDate" name="issueDate" type="date" defaultValue={defaultValues?.issueDate || today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">Valable jusqu&apos;au</Label>
              <Input id="validUntil" name="validUntil" type="date" defaultValue={validUntilDefault} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lignes de devis</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-[var(--muted-foreground)] px-1">
            <div className="col-span-4">Description</div>
            <div className="col-span-1">Qté</div>
            <div className="col-span-2">Prix unit. HT</div>
            <div className="col-span-1">TVA %</div>
            <div className="col-span-1">Rem. %</div>
            <div className="col-span-2 text-right">Total TTC</div>
            <div className="col-span-1"></div>
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                {products.length > 0 && (
                  <Select onValueChange={(v) => selectProduct(idx, v)}>
                    <SelectTrigger className="mb-1 h-7 text-xs">
                      <SelectValue placeholder="Produit catalogue" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(idx, "description", e.target.value)}
                  placeholder="Description..."
                  required
                  className="text-sm"
                />
              </div>
              <div className="col-span-1">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                  className="text-sm"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                  className="text-sm"
                />
              </div>
              <div className="col-span-1">
                <Select
                  value={String(item.vatRate)}
                  onValueChange={(v) => updateItem(idx, "vatRate", parseFloat(v))}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="6">6%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="21">21%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={item.discount}
                  onChange={(e) => updateItem(idx, "discount", parseFloat(e.target.value) || 0)}
                  className="text-sm"
                />
              </div>
              <div className="col-span-2 text-right text-sm font-medium">
                {formatCurrency(calcItemTotal(item))}
              </div>
              <div className="col-span-1 flex justify-end">
                {items.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => removeItem(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <Separator className="my-4" />

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Sous-total HT</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">TVA</span>
                <span>{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--muted-foreground)] flex-1">Remise</span>
                <div className="flex gap-1">
                  <Input id="discount" name="discount" type="number" min="0" step="0.01" defaultValue={defaultValues?.discount || 0} className="w-20 h-7 text-xs" />
                  <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                    <SelectTrigger className="w-16 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENT">%</SelectItem>
                      <SelectItem value="FIXED">€</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total TTC</span>
                <span className="text-[var(--primary)]">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader><CardTitle>Notes et conditions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={defaultValues?.notes || ""} placeholder="Notes visibles sur le devis..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conditions">Conditions générales</Label>
            <Textarea
              id="conditions"
              name="conditions"
              defaultValue={
                defaultValues?.conditions ||
                (selectedTemplate?.autoConditions ? (selectedTemplate.conditions ?? "") : "")
              }
              placeholder="Conditions de paiement, délais..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !clientId}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {defaultValues ? "Enregistrer" : "Créer le devis"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
