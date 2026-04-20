"use client";

import { useState, useTransition } from "react";
import {
  Trash2, Plus, Loader2, Check,
  ChevronUp, ChevronDown, Copy, Package, FileText, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { PRESET_CONDITIONS } from "@/lib/quote-conditions";
import Link from "next/link";

interface Client { id: string; name: string; email?: string | null }
interface Product {
  id: string; name: string; unitPrice: number; vatRate: number;
  description?: string | null; unit: string; reference?: string | null;
}

interface LineItem {
  _key: string;
  id?: string;
  description: string;
  notes: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discount: number;
  unit: string;
  productId?: string;
  sortOrder: number;
}

interface InvoiceFormProps {
  clients: Client[];
  products: Product[];
  action: (data: any) => Promise<void>;
  defaultValues?: {
    title?: string;
    clientId?: string;
    clientRef?: string;
    issueDate?: string;
    dueDate?: string;
    notes?: string;
    conditions?: string;
    discount?: number;
    discountType?: "PERCENT" | "FIXED";
    items?: Array<{
      id?: string;
      description: string;
      notes?: string;
      quantity: number;
      unitPrice: number;
      vatRate: number;
      discount: number;
      unit?: string;
      productId?: string;
      sortOrder: number;
    }>;
  };
  cancelHref?: string;
}

const DEFAULT_UNITS = ["heure", "jour", "unité", "forfait", "m²", "kg", "litre", "mois"];
const DEFAULT_VAT = [0, 6, 12, 21];

function newKey() { return Math.random().toString(36).slice(2); }
function lineHT(item: LineItem) { return item.quantity * item.unitPrice * (1 - item.discount / 100); }
function lineTTC(item: LineItem) { return lineHT(item) * (1 + item.vatRate / 100); }

export function InvoiceForm({
  clients, products, action, defaultValues, cancelHref = "/factures",
}: InvoiceFormProps) {
  const [pending, startTransition] = useTransition();
  const [clientId, setClientId] = useState(defaultValues?.clientId || "");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">(defaultValues?.discountType || "PERCENT");
  const [discountValue, setDiscountValue] = useState(defaultValues?.discount ?? 0);
  const [conditions, setConditions] = useState(defaultValues?.conditions ?? "");
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<LineItem[]>(
    defaultValues?.items?.length
      ? defaultValues.items.map((i) => ({ ...i, _key: newKey(), notes: i.notes || "", unit: i.unit || "unité" }))
      : [{ _key: newKey(), description: "", notes: "", quantity: 1, unitPrice: 0, vatRate: 21, discount: 0, unit: "unité", sortOrder: 0 }]
  );

  const addLine = () => {
    const lastVat = items.length > 0 ? items[items.length - 1].vatRate : 21;
    const lastUnit = items.length > 0 ? items[items.length - 1].unit : "unité";
    setItems((prev) => [
      ...prev,
      { _key: newKey(), description: "", notes: "", quantity: 1, unitPrice: 0, vatRate: lastVat, discount: 0, unit: lastUnit, sortOrder: prev.length },
    ]);
  };

  const removeLine = (key: string) => setItems((prev) => prev.filter((i) => i._key !== key));

  const duplicateLine = (key: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i._key === key);
      if (idx === -1) return prev;
      const copy = { ...prev[idx], _key: newKey(), id: undefined };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const moveLine = (key: string, dir: -1 | 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i._key === key);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  const updateLine = (key: string, field: keyof LineItem, value: any) =>
    setItems((prev) => prev.map((item) => (item._key === key ? { ...item, [field]: value } : item)));

  const selectProduct = (key: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setItems((prev) =>
      prev.map((item) =>
        item._key === key
          ? { ...item, productId, description: product.name, unitPrice: product.unitPrice, vatRate: product.vatRate, unit: product.unit || "unité", notes: product.description || "" }
          : item
      )
    );
    if (product.description) setExpandedNotes((prev) => new Set([...prev, key]));
  };

  const toggleNotes = (key: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const subtotal = items.reduce((s, i) => s + lineHT(i), 0);
  const vatAmount = items.reduce((s, i) => s + lineHT(i) * (i.vatRate / 100), 0);
  const discountAmount = discountType === "PERCENT" ? (subtotal * discountValue) / 100 : discountValue;
  const total = subtotal + vatAmount - discountAmount;

  const vatByRate = items.reduce((acc, item) => {
    const base = lineHT(item);
    const k = `${item.vatRate}`;
    acc[k] = (acc[k] || 0) + base * (item.vatRate / 100);
    return acc;
  }, {} as Record<string, number>);
  const vatEntries = Object.entries(vatByRate).filter(([, v]) => v > 0).sort(([a], [b]) => parseFloat(a) - parseFloat(b));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      title: (fd.get("title") as string) || undefined,
      clientId,
      clientRef: (fd.get("clientRef") as string) || undefined,
      issueDate: fd.get("issueDate") as string,
      dueDate: (fd.get("dueDate") as string) || undefined,
      notes: (fd.get("notes") as string) || undefined,
      conditions: conditions || undefined,
      discount: discountValue,
      discountType,
      items: items.map((item, i) => ({
        id: item.id,
        description: item.description,
        notes: item.notes || undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        discount: item.discount,
        unit: item.unit,
        productId: item.productId,
        sortOrder: i,
      })),
    };
    startTransition(() => action(data));
  }

  const today = new Date().toISOString().split("T")[0];
  const defaultDueDate = defaultValues?.dueDate ?? (() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split("T")[0];
  })();

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Informations générales */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-medium text-[var(--muted-foreground)]">Titre / Objet</Label>
              <Input id="title" name="title" defaultValue={defaultValues?.title || ""} placeholder="ex: Travaux de peinture, Prestation de conseil…" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-[var(--muted-foreground)]">
                  Client <span className="text-red-500">*</span>
                </Label>
                <Link href="/clients/new" target="_blank"
                  className="text-[10px] text-[var(--primary)] hover:underline flex items-center gap-1">
                  <UserPlus className="h-3 w-3" /> Nouveau client
                </Link>
              </div>
              <Select value={clientId} onValueChange={setClientId} required>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sélectionner un client…" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="font-medium">{c.name}</span>
                      {c.email && <span className="text-xs text-[var(--muted-foreground)] ml-1.5">— {c.email}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="issueDate" className="text-xs font-medium text-[var(--muted-foreground)]">
                Date d&apos;émission <span className="text-red-500">*</span>
              </Label>
              <Input id="issueDate" name="issueDate" type="date" defaultValue={defaultValues?.issueDate || today} required className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate" className="text-xs font-medium text-[var(--muted-foreground)]">Date d&apos;échéance</Label>
              <Input id="dueDate" name="dueDate" type="date" defaultValue={defaultDueDate} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientRef" className="text-xs font-medium text-[var(--muted-foreground)]">Réf. commande client</Label>
              <Input id="clientRef" name="clientRef" defaultValue={defaultValues?.clientRef || ""} placeholder="BC-2025-001…" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[var(--muted-foreground)]">Statut initial</Label>
              <div className="h-9 px-3 flex items-center rounded-lg border border-[var(--border)] bg-slate-50 text-sm text-slate-500">
                Brouillon
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lignes */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            Lignes de la facture
            <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">
              {items.length} ligne{items.length !== 1 ? "s" : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="hidden lg:grid lg:grid-cols-[1fr_72px_96px_88px_72px_72px_88px_72px] gap-2 text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide px-3 pb-1 border-b border-[var(--border)]">
            <div>Description</div><div className="text-center">Qté</div><div>Unité</div>
            <div className="text-right">Prix HT</div><div className="text-center">TVA</div>
            <div className="text-center">Rem.%</div><div className="text-right">Total TTC</div><div />
          </div>

          {items.map((item, idx) => (
            <div key={item._key} className="rounded-xl border border-[var(--border)] bg-white overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--muted)]/50 border-b border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--muted-foreground)] w-4 shrink-0 text-center">{idx + 1}</span>
                {products.length > 0 && (
                  <Select onValueChange={(v) => selectProduct(item._key, v)}>
                    <SelectTrigger className="h-7 text-xs flex-1 max-w-[260px] bg-white/80 shadow-sm">
                      <Package className="h-3 w-3 mr-1 text-[var(--muted-foreground)] shrink-0" />
                      <SelectValue placeholder="Choisir du catalogue…" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="font-medium truncate">{p.name}</span>
                          <span className="text-[10px] text-[var(--muted-foreground)] ml-2 shrink-0">
                            {formatCurrency(p.unitPrice)}/{p.unit}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="ml-auto flex items-center gap-0.5 shrink-0">
                  <button type="button" onClick={() => toggleNotes(item._key)}
                    className={`h-6 w-6 rounded flex items-center justify-center transition-colors ${expandedNotes.has(item._key) ? "bg-blue-100 text-blue-600" : "hover:bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
                    <FileText className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => moveLine(item._key, -1)} disabled={idx === 0}
                    className="h-6 w-6 rounded flex items-center justify-center hover:bg-[var(--muted)] text-[var(--muted-foreground)] disabled:opacity-25 transition-colors">
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => moveLine(item._key, 1)} disabled={idx === items.length - 1}
                    className="h-6 w-6 rounded flex items-center justify-center hover:bg-[var(--muted)] text-[var(--muted-foreground)] disabled:opacity-25 transition-colors">
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => duplicateLine(item._key)}
                    className="h-6 w-6 rounded flex items-center justify-center hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors">
                    <Copy className="h-3 w-3" />
                  </button>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeLine(item._key)}
                      className="h-6 w-6 rounded flex items-center justify-center hover:bg-red-50 text-[var(--muted-foreground)] hover:text-red-500 transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="p-3 space-y-2">
                <Input value={item.description} onChange={(e) => updateLine(item._key, "description", e.target.value)}
                  placeholder="Description de la prestation ou du produit…" required
                  className="h-9 font-medium border-0 border-b rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-[var(--primary)] text-sm" />
                {expandedNotes.has(item._key) && (
                  <Textarea value={item.notes} onChange={(e) => updateLine(item._key, "notes", e.target.value)}
                    placeholder="Détails, spécifications…" rows={2} className="text-xs text-[var(--muted-foreground)] resize-none border-dashed" />
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[72px_96px_88px_72px_72px_1fr] gap-2 items-end">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--muted-foreground)] font-medium uppercase tracking-wide">Quantité</label>
                    <Input type="number" min="0" step="0.01" value={item.quantity}
                      onChange={(e) => updateLine(item._key, "quantity", parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm text-center" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--muted-foreground)] font-medium uppercase tracking-wide">Unité</label>
                    <Select value={item.unit} onValueChange={(v) => updateLine(item._key, "unit", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEFAULT_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--muted-foreground)] font-medium uppercase tracking-wide">Prix HT</label>
                    <div className="relative">
                      <Input type="number" min="0" step="0.01" value={item.unitPrice}
                        onChange={(e) => updateLine(item._key, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm pr-5" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted-foreground)] pointer-events-none">€</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--muted-foreground)] font-medium uppercase tracking-wide">TVA</label>
                    <Select value={String(item.vatRate)} onValueChange={(v) => updateLine(item._key, "vatRate", parseFloat(v))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEFAULT_VAT.map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-[var(--muted-foreground)] font-medium uppercase tracking-wide">Rem.%</label>
                    <div className="relative">
                      <Input type="number" min="0" max="100" step="0.01" value={item.discount}
                        onChange={(e) => updateLine(item._key, "discount", parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm pr-5" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted-foreground)] pointer-events-none">%</span>
                    </div>
                  </div>
                  <div className="flex items-end justify-end pb-0.5">
                    <div className="text-right">
                      <p className="text-base font-bold">{formatCurrency(lineTTC(item))}</p>
                      {item.discount > 0 && <p className="text-[10px] text-emerald-600">−{item.discount}% appliqué</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addLine}
            className="w-full border-2 border-dashed border-[var(--border)] rounded-xl py-3 text-sm text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" /> Ajouter une ligne
          </button>

          <div className="flex justify-end pt-2">
            <div className="w-full max-w-xs space-y-2 bg-[var(--muted)]/40 rounded-xl p-4 border border-[var(--border)]">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Sous-total HT</span>
                <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              {vatEntries.length > 0
                ? vatEntries.map(([rate, amount]) => (
                    <div key={rate} className="flex justify-between text-sm">
                      <span className="text-[var(--muted-foreground)]">TVA {rate}%</span>
                      <span className="tabular-nums">{formatCurrency(amount)}</span>
                    </div>
                  ))
                : <div className="flex justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">TVA</span>
                    <span className="tabular-nums">{formatCurrency(vatAmount)}</span>
                  </div>
              }
              <div className="flex items-center gap-2 pt-1">
                <span className="text-sm text-[var(--muted-foreground)] flex-1 shrink-0">Remise globale</span>
                <Input type="number" min="0" step="0.01" value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-16 h-7 text-xs text-center" />
                <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                  <SelectTrigger className="w-14 h-7 text-xs shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">%</SelectItem>
                    <SelectItem value="FIXED">€</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Remise</span><span className="tabular-nums">−{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-sm">Total TTC</span>
                <span className="font-bold text-2xl text-[var(--primary)] tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes et conditions */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Notes et conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-medium text-[var(--muted-foreground)]">Notes (visibles sur la facture)</Label>
            <Textarea id="notes" name="notes" defaultValue={defaultValues?.notes || ""}
              placeholder="Message pour le client, informations de paiement, remerciements…"
              rows={3} className="resize-none text-sm" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="conditions" className="text-xs font-medium text-[var(--muted-foreground)]">Conditions générales</Label>
              <Select onValueChange={(v) => setConditions(v)}>
                <SelectTrigger className="w-56 h-7 text-xs shrink-0">
                  <SelectValue placeholder="Choisir un modèle…" />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_CONDITIONS.map((p) => (
                    <SelectItem key={p.label} value={p.value} className="text-xs">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea id="conditions" name="conditions" value={conditions} onChange={(e) => setConditions(e.target.value)}
              placeholder="Conditions de paiement, pénalités de retard…"
              rows={5} className="resize-none text-sm" />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 pb-10">
        <Button type="submit" disabled={pending || !clientId} className="shadow-md shadow-blue-500/20 gap-2 min-w-[160px]">
          {pending
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
            : defaultValues ? "Enregistrer les modifications" : "Créer la facture"
          }
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
