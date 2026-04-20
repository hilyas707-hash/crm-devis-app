"use client";

import { useState, useRef, useTransition, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createTemplate, updateTemplate, deleteTemplate, setDefaultTemplate, updateTemplateLogo } from "@/actions/templates";
import { PRESET_CONDITIONS } from "@/lib/quote-conditions";
import {
  Plus, Trash2, Star, Check, Loader2, Upload, X, Palette, Type,
  FileText, CreditCard, Ruler, Tag, Globe, Clock, ChevronDown,
  Percent, Settings2, Package, Image, Paperclip, AlignStartHorizontal, AlignEndHorizontal,
} from "lucide-react";

// ──────────────── Types ────────────────
export interface TemplateData {
  id: string;
  name: string;
  isDefault: boolean;
  color: string;
  font: string;
  logo: string | null;
  footer: string;
  showBank: boolean;
  conditions: string;
  autoConditions: boolean;
  vatRates: string;
  paymentMethods: string;
  units: string;
  categories: string;
  validityDays: number;
  showInternalRef: boolean;
  showClientRef: boolean;
  showDelivery: boolean;
  currency: string;
  language: string;
  headerImage: string | null;
  footerImage: string | null;
  attachments: string; // JSON: [{name, data}]
}

// ──────────────── Valeurs par défaut ────────────────
const DEFAULT_TPL: Omit<TemplateData, "id"> = {
  name: "Nouveau template",
  isDefault: false,
  color: "#2563eb",
  font: "Helvetica",
  logo: null,
  footer: "",
  showBank: true,
  conditions: "",
  autoConditions: true,
  vatRates: "6,12,21",
  paymentMethods: "VIREMENT,CHEQUE,CARTE,ESPECES",
  units: "heure,jour,unité,forfait,m²,kg,litre,mois",
  categories: "Services,Produits,Logiciels,Matériaux,Autres",
  validityDays: 30,
  showInternalRef: false,
  showClientRef: false,
  showDelivery: false,
  currency: "EUR",
  language: "fr-BE",
  headerImage: null,
  footerImage: null,
  attachments: "",
};

// ──────────────── Constantes UI ────────────────
const COLORS = [
  "#2563eb","#0891b2","#059669","#7c3aed","#dc2626","#ea580c","#0f172a","#374151",
];
const FONTS = [
  { value: "Helvetica", label: "Helvetica", css: "sans-serif" },
  { value: "Times-Roman", label: "Times Roman", css: "Georgia, serif" },
  { value: "Courier", label: "Courier", css: "monospace" },
];
const VAT_OPTIONS = ["0","6","12","21"];
const PAYMENT_OPTIONS = [
  { value: "VIREMENT", label: "Virement" },
  { value: "CHEQUE", label: "Chèque" },
  { value: "CARTE", label: "Carte" },
  { value: "ESPECES", label: "Espèces" },
  { value: "PAYPAL", label: "PayPal" },
  { value: "STRIPE", label: "Stripe" },
  { value: "SEPA", label: "SEPA" },
  { value: "CRYPTO", label: "Crypto" },
];
const CURRENCY_OPTIONS = [
  { value: "EUR", label: "€ Euro" },
  { value: "USD", label: "$ Dollar US" },
  { value: "GBP", label: "£ Livre" },
  { value: "CHF", label: "₣ CHF" },
  { value: "MAD", label: "DH Dirham" },
  { value: "CAD", label: "C$ CAD" },
];
const LANGUAGE_OPTIONS = [
  { value: "fr-BE", label: "🇧🇪 Français (BE)" },
  { value: "fr-FR", label: "🇫🇷 Français (FR)" },
  { value: "en-GB", label: "🇬🇧 English" },
  { value: "nl-BE", label: "🇧🇪 Nederlands" },
  { value: "de-DE", label: "🇩🇪 Deutsch" },
  { value: "ar-MA", label: "🇲🇦 العربية" },
];
const QUICK_UNITS = ["heure","jour","unité","forfait","m²","m³","kg","litre","mois","séance"];
const QUICK_CATEGORIES = ["Services","Produits","Logiciels","Matériaux","Conseil","Formation","Transport","Maintenance"];

// ──────────────── Sous-composants ────────────────
function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
        active ? "bg-[var(--primary)] text-white border-[var(--primary)]"
               : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
      }`}
    >
      {active && <Check className="h-3 w-3" />}
      {children}
    </button>
  );
}

function TagInput({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && !input && values.length > 0) onChange(values.slice(0, -1));
  }
  return (
    <div className="flex flex-wrap gap-1 min-h-[38px] border border-[var(--border)] rounded-md px-2 py-1 bg-[var(--background)] focus-within:ring-2 focus-within:ring-[var(--ring)] cursor-text"
      onClick={() => ref.current?.focus()}>
      {values.map((v) => (
        <span key={v} className="flex items-center gap-1 bg-[var(--primary)]/10 text-[var(--primary)] text-xs px-2 py-0.5 rounded-full">
          {v}
          <button type="button" onClick={() => onChange(values.filter((x) => x !== v))}><X className="h-2.5 w-2.5" /></button>
        </span>
      ))}
      <input ref={ref} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} onBlur={add}
        placeholder={values.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[80px] text-xs bg-transparent outline-none placeholder:text-[var(--muted-foreground)]" />
    </div>
  );
}

function SwitchRow({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border)] cursor-pointer hover:bg-[var(--muted)]/30"
      onClick={() => onChange(!checked)}>
      <div>
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-xs text-[var(--muted-foreground)]">{sub}</p>}
      </div>
      <div className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? "bg-[var(--primary)]" : "bg-[var(--muted)]"}`}>
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
    </div>
  );
}

// ──────────────── Éditeur d'un template ────────────────
function TemplateEditor({
  tpl, onSave, onSetDefault, onDelete, companyName,
}: {
  tpl: TemplateData | null;
  onSave: (data: Omit<TemplateData, "id">, id?: string) => Promise<void>;
  onSetDefault: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  companyName: string;
}) {
  const isNew = !tpl;
  const [name, setName] = useState(tpl?.name ?? "Nouveau template");
  const [isDefault, setIsDefault] = useState(tpl?.isDefault ?? false);
  const [color, setColor] = useState(tpl?.color ?? "#2563eb");
  const [font, setFont] = useState(tpl?.font ?? "Helvetica");
  const [logo, setLogo] = useState<string | null>(tpl?.logo ?? null);
  const [headerImage, setHeaderImage] = useState<string | null>(tpl?.headerImage ?? null);
  const [footerImage, setFooterImage] = useState<string | null>(tpl?.footerImage ?? null);
  const [attachments, setAttachments] = useState<{ name: string; data: string }[]>(
    tpl?.attachments ? ((): { name: string; data: string }[] => { try { return JSON.parse(tpl.attachments); } catch { return []; } })() : []
  );
  const [footer, setFooter] = useState(tpl?.footer ?? "");
  const [showBank, setShowBank] = useState(tpl?.showBank ?? true);
  const [conditions, setConditions] = useState(tpl?.conditions ?? "");
  const [autoConditions, setAutoConditions] = useState(tpl?.autoConditions ?? true);
  const [vatRates, setVatRates] = useState<string[]>((tpl?.vatRates || "6,12,21").split(",").filter(Boolean));
  const [paymentMethods, setPaymentMethods] = useState<string[]>((tpl?.paymentMethods || "VIREMENT,CHEQUE,CARTE,ESPECES").split(",").filter(Boolean));
  const [units, setUnits] = useState<string[]>((tpl?.units || "heure,jour,unité,forfait,m²,kg,litre,mois").split(",").filter(Boolean));
  const [categories, setCategories] = useState<string[]>((tpl?.categories || "Services,Produits,Logiciels,Matériaux,Autres").split(",").filter(Boolean));
  const [validityDays, setValidityDays] = useState(tpl?.validityDays ?? 30);
  const [showInternalRef, setShowInternalRef] = useState(tpl?.showInternalRef ?? false);
  const [showClientRef, setShowClientRef] = useState(tpl?.showClientRef ?? false);
  const [showDelivery, setShowDelivery] = useState(tpl?.showDelivery ?? false);
  const [currency, setCurrency] = useState(tpl?.currency ?? "EUR");
  const [language, setLanguage] = useState(tpl?.language ?? "fr-BE");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const headerImgRef = useRef<HTMLInputElement>(null);
  const footerImgRef = useRef<HTMLInputElement>(null);
  const attachRef = useRef<HTMLInputElement>(null);

  function toggle(list: string[], set: (v: string[]) => void, v: string) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  async function handleSave() {
    setSaving(true);
    await onSave({
      name, isDefault, color, font, logo, footer, showBank,
      conditions, autoConditions,
      vatRates: vatRates.join(","),
      paymentMethods: paymentMethods.join(","),
      units: units.join(","),
      categories: categories.join(","),
      validityDays, showInternalRef, showClientRef, showDelivery, currency, language,
      headerImage,
      footerImage,
      attachments: attachments.length > 0 ? JSON.stringify(attachments) : "",
    }, tpl?.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function readImageFile(file: File, onResult: (b64: string) => void) {
    const reader = new FileReader();
    reader.onload = (ev) => onResult(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleHeaderImgFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    readImageFile(file, setHeaderImage);
  }

  function handleFooterImgFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    readImageFile(file, setFooterImage);
  }

  function handleAttachFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      readImageFile(file, (data) => {
        setAttachments((prev) => [...prev, { name: file.name, data }]);
      });
    });
    e.target.value = "";
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveAttachment(idx: number, dir: -1 | 1) {
    setAttachments((prev) => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  }

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64 = ev.target?.result as string;
      setLogo(b64);
      if (tpl?.id) await updateTemplateLogo(tpl.id, b64);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      {/* Nom + actions */}
      <div className="flex items-center gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="font-semibold text-base flex-1"
          placeholder="Nom du template"
        />
        {!isNew && (
          <>
            {!tpl!.isDefault && (
              <Button type="button" size="sm" variant="outline" onClick={() => onSetDefault(tpl!.id)}>
                <Star className="h-3.5 w-3.5" /> Par défaut
              </Button>
            )}
            {tpl!.isDefault && (
              <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> Défaut</Badge>
            )}
            <Button type="button" size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => onDelete(tpl!.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>

      {/* Aperçu live */}
      <div className="rounded-xl overflow-hidden border border-[var(--border)] shadow-sm">
        <div className="p-4 text-white flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${color}ee, ${color})` }}>
          <div className="flex items-center gap-3">
            {logo
              ? <img src={logo} alt="Logo" className="h-9 w-auto bg-white rounded p-0.5 object-contain max-w-[100px]" />
              : <div className="h-9 w-9 bg-white/20 rounded flex items-center justify-center text-sm font-bold">{companyName.slice(0, 2).toUpperCase()}</div>
            }
            <div>
              <p className="font-bold text-sm" style={{ fontFamily: FONTS.find(f => f.value === font)?.css }}>{companyName}</p>
              <p className="text-xs opacity-70">TVA : BE 0000.000.000</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold" style={{ fontFamily: FONTS.find(f => f.value === font)?.css }}>DEVIS</p>
            <p className="text-xs opacity-70">DEV-001 · {validityDays}j validité</p>
          </div>
        </div>
        <div className="bg-white px-4 py-2 flex items-center gap-2 border-t border-[var(--border)]/50">
          {vatRates.map(r => <span key={r} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: color + "18", color }}>{r}% TVA</span>)}
          <span className="text-xs text-[var(--muted-foreground)] ml-auto">{currency} · {language}</span>
        </div>
      </div>

      {/* Onglets de l'éditeur */}
      <Tabs defaultValue="visuel">
        <TabsList className="w-full">
          <TabsTrigger value="visuel" className="flex-1"><Palette className="h-3.5 w-3.5 mr-1" />Visuel</TabsTrigger>
          <TabsTrigger value="contenu" className="flex-1"><FileText className="h-3.5 w-3.5 mr-1" />Contenu</TabsTrigger>
          <TabsTrigger value="pieces" className="flex-1"><Paperclip className="h-3.5 w-3.5 mr-1" />Pièces jointes</TabsTrigger>
          <TabsTrigger value="preferences" className="flex-1"><Settings2 className="h-3.5 w-3.5 mr-1" />Préférences</TabsTrigger>
        </TabsList>

        {/* ── Visuel ── */}
        <TabsContent value="visuel" className="space-y-4 mt-4">
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" /> Couleur principale
            </Label>
            <div className="flex flex-wrap gap-2 items-center">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                  style={{ backgroundColor: c, borderColor: color === c ? "#000" : "transparent" }}>
                  {color === c && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="h-7 w-8 cursor-pointer rounded border border-[var(--border)]" />
              <Input value={color} onChange={(e) => setColor(e.target.value)} className="w-24 font-mono text-xs h-7" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-1.5">
              <Type className="h-3.5 w-3.5" /> Police
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {FONTS.map((f) => (
                <button key={f.value} type="button" onClick={() => setFont(f.value)}
                  className={`border rounded-lg p-2.5 text-left transition-colors ${font === f.value ? "border-[var(--primary)] bg-blue-50" : "border-[var(--border)] hover:border-[var(--muted-foreground)]"}`}>
                  <p className="text-lg mb-0.5" style={{ fontFamily: f.css }}>Aa</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">{f.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-1.5">
              <Image className="h-3.5 w-3.5" /> Logo
            </Label>
            {logo ? (
              <div className="flex items-center gap-3">
                <img src={logo} alt="Logo" className="h-12 w-auto object-contain border rounded p-1 max-w-[160px]" />
                <div className="flex flex-col gap-1.5">
                  <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                    <Upload className="h-3 w-3" /> Changer
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="text-red-600 border-red-200"
                    onClick={() => setLogo(null)}>
                    <Trash2 className="h-3 w-3" /> Supprimer
                  </Button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-[var(--border)] rounded-lg p-5 text-center hover:border-[var(--primary)] transition-colors">
                <Upload className="h-5 w-5 mx-auto mb-1.5 text-[var(--muted-foreground)]" />
                <p className="text-xs font-medium">Cliquez pour uploader votre logo</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">PNG, JPG, SVG — max 1 Mo</p>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
          </div>

          {/* ── Bannière entête ── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-1.5">
              <AlignStartHorizontal className="h-3.5 w-3.5" /> Bannière entête (haut du PDF)
            </Label>
            <p className="text-[10px] text-[var(--muted-foreground)]">Image pleine largeur affichée tout en haut de chaque page du document.</p>
            {headerImage ? (
              <div className="space-y-2">
                <img src={headerImage} alt="Entête" className="w-full h-16 object-cover rounded border border-[var(--border)]" />
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => headerImgRef.current?.click()}>
                    <Upload className="h-3 w-3" /> Changer
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="text-red-600 border-red-200"
                    onClick={() => setHeaderImage(null)}>
                    <Trash2 className="h-3 w-3" /> Supprimer
                  </Button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => headerImgRef.current?.click()}
                className="w-full border-2 border-dashed border-[var(--border)] rounded-lg p-4 text-center hover:border-[var(--primary)] transition-colors flex items-center justify-center gap-2">
                <AlignStartHorizontal className="h-4 w-4 text-[var(--muted-foreground)]" />
                <span className="text-xs font-medium text-[var(--muted-foreground)]">Uploader une bannière entête — PNG, JPG</span>
              </button>
            )}
            <input ref={headerImgRef} type="file" accept="image/*" className="hidden" onChange={handleHeaderImgFile} />
          </div>

          {/* ── Image bas de page ── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-1.5">
              <AlignEndHorizontal className="h-3.5 w-3.5" /> Image bas de page (fixe sur chaque page)
            </Label>
            <p className="text-[10px] text-[var(--muted-foreground)]">Image affichée en bas de chaque page (signature, cachet, footer graphique…).</p>
            {footerImage ? (
              <div className="space-y-2">
                <img src={footerImage} alt="Bas de page" className="w-full h-14 object-cover rounded border border-[var(--border)]" />
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => footerImgRef.current?.click()}>
                    <Upload className="h-3 w-3" /> Changer
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="text-red-600 border-red-200"
                    onClick={() => setFooterImage(null)}>
                    <Trash2 className="h-3 w-3" /> Supprimer
                  </Button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => footerImgRef.current?.click()}
                className="w-full border-2 border-dashed border-[var(--border)] rounded-lg p-4 text-center hover:border-[var(--primary)] transition-colors flex items-center justify-center gap-2">
                <AlignEndHorizontal className="h-4 w-4 text-[var(--muted-foreground)]" />
                <span className="text-xs font-medium text-[var(--muted-foreground)]">Uploader une image bas de page — PNG, JPG</span>
              </button>
            )}
            <input ref={footerImgRef} type="file" accept="image/*" className="hidden" onChange={handleFooterImgFile} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Texte pied de page</Label>
            <Input value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="Texte en bas de chaque page du PDF" />
          </div>

          <SwitchRow label="Afficher les coordonnées bancaires" sub="IBAN / BIC visible sur le PDF" checked={showBank} onChange={setShowBank} />
        </TabsContent>

        {/* ── Contenu ── */}
        <TabsContent value="contenu" className="space-y-4 mt-4">
          <SwitchRow
            label="Pré-remplir les conditions automatiquement"
            sub="Appliqué à la création d'un nouveau devis avec ce template"
            checked={autoConditions}
            onChange={setAutoConditions}
          />
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Modèle pré-rédigé</Label>
            <div className="relative">
              <select defaultValue=""
                onChange={(e) => { if (e.target.value) setConditions(e.target.value); }}
                className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-[var(--background)] appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]">
                <option value="">— Choisir un modèle —</option>
                {PRESET_CONDITIONS.map((p) => (
                  <option key={p.label} value={p.value}>{p.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 pointer-events-none text-[var(--muted-foreground)]" />
            </div>
          </div>
          <Textarea value={conditions} onChange={(e) => setConditions(e.target.value)}
            rows={10} placeholder="Conditions de vente par défaut…" className="text-xs leading-relaxed" />
        </TabsContent>

        {/* ── Pièces jointes ── */}
        <TabsContent value="pieces" className="space-y-4 mt-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 p-3 text-xs text-[var(--muted-foreground)] space-y-1">
            <p className="font-semibold text-[var(--foreground)]">Documents annexés au PDF</p>
            <p>Ces pages sont ajoutées <strong>après le devis</strong> dans le PDF généré. Idéal pour les conditions générales de vente, fiches techniques, tarifs, etc.</p>
            <p>Formats acceptés : <strong>PNG, JPG</strong> (une image = une page). Pour un PDF, convertissez chaque page en image avant de l'uploader.</p>
          </div>

          {/* Liste des pièces jointes */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--border)] bg-white">
                  <img src={att.data} alt={att.name} className="h-12 w-16 object-cover rounded border border-[var(--border)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{att.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Page {idx + 1}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => moveAttachment(idx, -1)} disabled={idx === 0}
                      className="p-1.5 rounded hover:bg-[var(--muted)] disabled:opacity-30 transition-colors" title="Monter">
                      ↑
                    </button>
                    <button type="button" onClick={() => moveAttachment(idx, 1)} disabled={idx === attachments.length - 1}
                      className="p-1.5 rounded hover:bg-[var(--muted)] disabled:opacity-30 transition-colors" title="Descendre">
                      ↓
                    </button>
                    <button type="button" onClick={() => removeAttachment(idx)}
                      className="p-1.5 rounded text-red-500 hover:bg-red-50 transition-colors" title="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button type="button" onClick={() => attachRef.current?.click()}
            className="w-full border-2 border-dashed border-[var(--border)] rounded-lg p-5 text-center hover:border-[var(--primary)] transition-colors">
            <Paperclip className="h-5 w-5 mx-auto mb-1.5 text-[var(--muted-foreground)]" />
            <p className="text-xs font-medium">Ajouter des pages (images)</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">PNG, JPG — plusieurs fichiers acceptés</p>
          </button>
          <input ref={attachRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAttachFiles} />

          {attachments.length === 0 && (
            <p className="text-center text-xs text-[var(--muted-foreground)] py-2">Aucune pièce jointe pour ce template</p>
          )}
        </TabsContent>

        {/* ── Préférences ── */}
        <TabsContent value="preferences" className="space-y-5 mt-4">
          {/* TVA */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5" /> Taux de TVA
            </Label>
            <div className="flex flex-wrap gap-2">
              {VAT_OPTIONS.map((v) => (
                <Pill key={v} active={vatRates.includes(v)} onClick={() => toggle(vatRates, setVatRates, v)}>{v} %</Pill>
              ))}
            </div>
          </div>

          {/* Modes de paiement */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Modes de paiement
            </Label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_OPTIONS.map((p) => (
                <Pill key={p.value} active={paymentMethods.includes(p.value)} onClick={() => toggle(paymentMethods, setPaymentMethods, p.value)}>
                  {p.label}
                </Pill>
              ))}
            </div>
          </div>

          {/* Unités + Catégories */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-1.5">
                <Ruler className="h-3.5 w-3.5" /> Unités
              </Label>
              <TagInput values={units} onChange={setUnits} placeholder="heure, jour…" />
              <div className="flex flex-wrap gap-1">
                {QUICK_UNITS.filter(u => !units.includes(u)).map(u => (
                  <button key={u} type="button" onClick={() => setUnits([...units, u])}
                    className="text-[10px] border border-dashed border-[var(--border)] px-1.5 py-0.5 rounded-full hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors flex items-center gap-0.5">
                    <Plus className="h-2.5 w-2.5" />{u}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Catégories
              </Label>
              <TagInput values={categories} onChange={setCategories} placeholder="Services, Produits…" />
              <div className="flex flex-wrap gap-1">
                {QUICK_CATEGORIES.filter(c => !categories.includes(c)).map(c => (
                  <button key={c} type="button" onClick={() => setCategories([...categories, c])}
                    className="text-[10px] border border-dashed border-[var(--border)] px-1.5 py-0.5 rounded-full hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors flex items-center gap-0.5">
                    <Plus className="h-2.5 w-2.5" />{c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5" /> Options du formulaire
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <SwitchRow label="Référence interne" checked={showInternalRef} onChange={setShowInternalRef} />
              <SwitchRow label="Réf. commande client" checked={showClientRef} onChange={setShowClientRef} />
              <SwitchRow label="Délai de livraison" checked={showDelivery} onChange={setShowDelivery} />
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--border)]">
              <Clock className="h-4 w-4 text-[var(--muted-foreground)]" />
              <span className="text-sm flex-1">Validité par défaut</span>
              <Input type="number" min={1} max={365} value={validityDays}
                onChange={(e) => setValidityDays(parseInt(e.target.value) || 30)}
                className="w-16 text-center h-8" />
              <span className="text-sm text-[var(--muted-foreground)]">jours</span>
            </div>
          </div>

          {/* Devise + Langue */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Devise
              </Label>
              <div className="grid grid-cols-2 gap-1">
                {CURRENCY_OPTIONS.map((c) => (
                  <button key={c.value} type="button" onClick={() => setCurrency(c.value)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded border text-left text-xs transition-colors ${currency === c.value ? "border-[var(--primary)] bg-blue-50 text-[var(--primary)] font-semibold" : "border-[var(--border)] hover:border-[var(--muted-foreground)]"}`}>
                    {currency === c.value && <Check className="h-3 w-3 shrink-0" />}
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" /> Langue
              </Label>
              <div className="space-y-1">
                {LANGUAGE_OPTIONS.map((l) => (
                  <button key={l.value} type="button" onClick={() => setLanguage(l.value)}
                    className={`w-full flex items-center gap-1 px-2 py-1.5 rounded border text-left text-xs transition-colors ${language === l.value ? "border-[var(--primary)] bg-blue-50 text-[var(--primary)] font-semibold" : "border-[var(--border)] hover:border-[var(--muted-foreground)]"}`}>
                    {language === l.value && <Check className="h-3 w-3 shrink-0" />}
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Button type="button" onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Sauvegarde…</>
                 : saved ? <><Check className="h-4 w-4" /> Sauvegardé !</>
                 : isNew ? "Créer le template" : "Enregistrer les modifications"}
      </Button>
    </div>
  );
}

// ──────────────── Manager principal ────────────────
export function QuoteTemplateManager({ initialTemplates, companyName }: {
  initialTemplates: TemplateData[];
  companyName: string;
}) {
  const [templates, setTemplates] = useState<TemplateData[]>(initialTemplates);
  const [selectedId, setSelectedId] = useState<string | "new">(
    initialTemplates.find(t => t.isDefault)?.id || initialTemplates[0]?.id || "new"
  );
  const [, startTransition] = useTransition();

  const selected = selectedId === "new" ? null : templates.find(t => t.id === selectedId) ?? null;

  async function handleSave(data: Omit<TemplateData, "id">, id?: string) {
    if (id) {
      await updateTemplate(id, data);
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...data } : data.isDefault ? { ...t, isDefault: false } : t));
    } else {
      const newId = await createTemplate(data);
      const newTpl: TemplateData = { id: newId, ...data };
      setTemplates(prev => data.isDefault ? [...prev.map(t => ({ ...t, isDefault: false })), newTpl] : [...prev, newTpl]);
      setSelectedId(newId);
    }
  }

  async function handleSetDefault(id: string) {
    await setDefaultTemplate(id);
    setTemplates(prev => prev.map(t => ({ ...t, isDefault: t.id === id })));
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce template ?")) return;
    await deleteTemplate(id);
    const remaining = templates.filter(t => t.id !== id);
    setTemplates(remaining);
    setSelectedId(remaining[0]?.id || "new");
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[600px]">
      {/* Sidebar liste */}
      <div className="md:w-56 shrink-0 space-y-2">
        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide px-1 mb-3">Mes templates</p>

        {templates.map((tpl) => (
          <button key={tpl.id} type="button" onClick={() => setSelectedId(tpl.id)}
            className={`w-full text-left rounded-xl border-2 overflow-hidden transition-all ${selectedId === tpl.id ? "border-[var(--primary)] shadow-sm" : "border-[var(--border)] hover:border-[var(--muted-foreground)]"}`}>
            <div className="h-2" style={{ backgroundColor: tpl.color }} />
            <div className="p-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">{tpl.name}</span>
                {tpl.isDefault && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />}
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                {tpl.font} · {tpl.vatRates.split(",").map(r => `${r}%`).join(", ")}
              </p>
            </div>
          </button>
        ))}

        <button type="button" onClick={() => setSelectedId("new")}
          className={`w-full text-left rounded-xl border-2 border-dashed p-2.5 transition-colors ${selectedId === "new" ? "border-[var(--primary)] bg-blue-50" : "border-[var(--border)] hover:border-[var(--primary)]"}`}>
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Plus className="h-4 w-4" />
            Nouveau template
          </div>
        </button>
      </div>

      {/* Panneau éditeur */}
      <div className="flex-1 min-w-0">
        <TemplateEditor
          key={selectedId}
          tpl={selected}
          onSave={handleSave}
          onSetDefault={handleSetDefault}
          onDelete={handleDelete}
          companyName={companyName}
        />
      </div>
    </div>
  );
}
