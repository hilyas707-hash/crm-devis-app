"use client";

import { useState, useTransition, useRef, KeyboardEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePreferences } from "@/actions/company";
import {
  Check, Loader2, Plus, X, Percent, CreditCard, Ruler, Tag,
  FileText, Globe, Clock, Hash, Package,
} from "lucide-react";

// ─────────── sous-composants ────────────

function PillToggle({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
        active
          ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
          : "bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
      }`}
    >
      {active && <Check className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  }

  function remove(item: string) {
    onChange(values.filter((v) => v !== item));
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && !input && values.length > 0) {
      remove(values[values.length - 1]);
    }
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 min-h-[42px] border border-[var(--border)] rounded-md px-2 py-1.5 bg-[var(--background)] cursor-text focus-within:ring-2 focus-within:ring-[var(--ring)]"
      onClick={() => inputRef.current?.focus()}
    >
      {values.map((v) => (
        <span
          key={v}
          className="flex items-center gap-1 bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-medium px-2 py-1 rounded-full"
        >
          {v}
          <button type="button" onClick={() => remove(v)} className="hover:text-red-500 transition-colors">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
        placeholder={values.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder:text-[var(--muted-foreground)]"
      />
    </div>
  );
}

function CardToggle({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
        active
          ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-sm"
          : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
      }`}
    >
      <div className={`p-2 rounded-full ${active ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
        {icon}
      </div>
      <span className={`text-xs font-semibold ${active ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>{label}</span>
      {sub && <span className="text-[10px] text-[var(--muted-foreground)]">{sub}</span>}
    </button>
  );
}

function SwitchRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]/30 transition-colors cursor-pointer"
      onClick={() => onChange(!checked)}
    >
      <div>
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{sub}</p>}
      </div>
      <div
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${checked ? "bg-[var(--primary)]" : "bg-[var(--muted)]"}`}
      >
        <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
      </div>
    </div>
  );
}

// ─────────── données ────────────

const VAT_OPTIONS = [
  { value: "0", label: "0 %" },
  { value: "6", label: "6 %" },
  { value: "12", label: "12 %" },
  { value: "21", label: "21 %" },
];

const PAYMENT_OPTIONS = [
  { value: "VIREMENT", label: "Virement", sub: "Bancaire", icon: <CreditCard className="h-4 w-4" /> },
  { value: "CHEQUE", label: "Chèque", sub: "Papier", icon: <FileText className="h-4 w-4" /> },
  { value: "CARTE", label: "Carte", sub: "Bancaire", icon: <CreditCard className="h-4 w-4" /> },
  { value: "ESPECES", label: "Espèces", sub: "Cash", icon: <Hash className="h-4 w-4" /> },
  { value: "PAYPAL", label: "PayPal", sub: "En ligne", icon: <Globe className="h-4 w-4" /> },
  { value: "STRIPE", label: "Stripe", sub: "En ligne", icon: <Globe className="h-4 w-4" /> },
  { value: "SEPA", label: "Prélèv. SEPA", sub: "Automatique", icon: <CreditCard className="h-4 w-4" /> },
  { value: "CRYPTO", label: "Crypto", sub: "Bitcoin…", icon: <Globe className="h-4 w-4" /> },
];

const CURRENCY_OPTIONS = [
  { value: "EUR", label: "€ Euro" },
  { value: "USD", label: "$ Dollar US" },
  { value: "GBP", label: "£ Livre Sterling" },
  { value: "CHF", label: "₣ Franc Suisse" },
  { value: "MAD", label: "DH Dirham" },
  { value: "CAD", label: "C$ Dollar CA" },
];

const LANGUAGE_OPTIONS = [
  { value: "fr-BE", label: "🇧🇪 Français (Belgique)" },
  { value: "fr-FR", label: "🇫🇷 Français (France)" },
  { value: "en-GB", label: "🇬🇧 English (UK)" },
  { value: "en-US", label: "🇺🇸 English (US)" },
  { value: "nl-BE", label: "🇧🇪 Nederlands" },
  { value: "de-DE", label: "🇩🇪 Deutsch" },
  { value: "ar-MA", label: "🇲🇦 العربية" },
];

// ─────────── composant principal ────────────

export interface CompanyPreferences {
  prefVatRates: string;
  prefPaymentMethods: string;
  prefUnits: string;
  prefCategories: string;
  prefValidityDays: number;
  prefShowInternalRef: boolean;
  prefShowClientRef: boolean;
  prefShowDelivery: boolean;
  prefAutoConditions: boolean;
  prefCurrency: string;
  prefLanguage: string;
}

export function PreferencesEditor({ prefs }: { prefs: CompanyPreferences }) {
  const [vatRates, setVatRates] = useState<string[]>((prefs.prefVatRates || "6,12,21").split(",").map((v) => v.trim()).filter(Boolean));
  const [paymentMethods, setPaymentMethods] = useState<string[]>((prefs.prefPaymentMethods || "VIREMENT,CHEQUE,CARTE,ESPECES").split(",").map((v) => v.trim()).filter(Boolean));
  const [units, setUnits] = useState<string[]>((prefs.prefUnits || "heure,jour,unité,forfait,m²,kg,litre,mois").split(",").map((v) => v.trim()).filter(Boolean));
  const [categories, setCategories] = useState<string[]>((prefs.prefCategories || "Services,Produits,Logiciels,Matériaux,Autres").split(",").map((v) => v.trim()).filter(Boolean));
  const [validityDays, setValidityDays] = useState(prefs.prefValidityDays ?? 30);
  const [showInternalRef, setShowInternalRef] = useState(prefs.prefShowInternalRef ?? false);
  const [showClientRef, setShowClientRef] = useState(prefs.prefShowClientRef ?? false);
  const [showDelivery, setShowDelivery] = useState(prefs.prefShowDelivery ?? false);
  const [autoConditions, setAutoConditions] = useState(prefs.prefAutoConditions ?? true);
  const [currency, setCurrency] = useState(prefs.prefCurrency || "EUR");
  const [language, setLanguage] = useState(prefs.prefLanguage || "fr-BE");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggleList(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("prefVatRates", vatRates.join(","));
    fd.append("prefPaymentMethods", paymentMethods.join(","));
    fd.append("prefUnits", units.join(","));
    fd.append("prefCategories", categories.join(","));
    fd.append("prefValidityDays", String(validityDays));
    fd.append("prefShowInternalRef", showInternalRef ? "true" : "false");
    fd.append("prefShowClientRef", showClientRef ? "true" : "false");
    fd.append("prefShowDelivery", showDelivery ? "true" : "false");
    fd.append("prefAutoConditions", autoConditions ? "true" : "false");
    fd.append("prefCurrency", currency);
    fd.append("prefLanguage", language);

    startTransition(async () => {
      await updatePreferences(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">

      {/* TVA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Percent className="h-4 w-4 text-[var(--primary)]" />
            Taux de TVA disponibles
          </CardTitle>
          <CardDescription className="text-xs">
            Taux affichés dans les menus déroulants des devis et factures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {VAT_OPTIONS.map((v) => (
              <PillToggle
                key={v.value}
                active={vatRates.includes(v.value)}
                onClick={() => toggleList(vatRates, setVatRates, v.value)}
              >
                {v.label}
              </PillToggle>
            ))}
          </div>
          {vatRates.length === 0 && (
            <p className="text-xs text-red-500 mt-2">Sélectionnez au moins un taux</p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {vatRates.length > 0 && vatRates.map((r) => (
              <span key={r} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                {r} % actif
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modes de paiement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[var(--primary)]" />
            Modes de paiement acceptés
          </CardTitle>
          <CardDescription className="text-xs">
            Apparaissent dans le formulaire d'enregistrement de paiement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {PAYMENT_OPTIONS.map((p) => (
              <CardToggle
                key={p.value}
                active={paymentMethods.includes(p.value)}
                onClick={() => toggleList(paymentMethods, setPaymentMethods, p.value)}
                icon={p.icon}
                label={p.label}
                sub={p.sub}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Unités + Catégories */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Ruler className="h-4 w-4 text-[var(--primary)]" />
              Unités de mesure
            </CardTitle>
            <CardDescription className="text-xs">Entrée + Entrée pour ajouter, × pour supprimer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <TagInput
              values={units}
              onChange={setUnits}
              placeholder="heure, jour, unité…"
            />
            <div className="flex flex-wrap gap-1 pt-1">
              {["heure", "jour", "unité", "forfait", "m²", "m³", "kg", "litre", "mois", "séance"].map((u) =>
                !units.includes(u) ? (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnits([...units, u])}
                    className="text-[10px] text-[var(--muted-foreground)] border border-dashed border-[var(--border)] px-2 py-0.5 rounded-full hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors flex items-center gap-1"
                  >
                    <Plus className="h-2.5 w-2.5" /> {u}
                  </button>
                ) : null
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="h-4 w-4 text-[var(--primary)]" />
              Catégories de produits
            </CardTitle>
            <CardDescription className="text-xs">Utilisées pour filtrer et classer les produits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <TagInput
              values={categories}
              onChange={setCategories}
              placeholder="Services, Produits…"
            />
            <div className="flex flex-wrap gap-1 pt-1">
              {["Services", "Produits", "Logiciels", "Matériaux", "Conseil", "Formation", "Transport", "Maintenance"].map((c) =>
                !categories.includes(c) ? (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategories([...categories, c])}
                    className="text-[10px] text-[var(--muted-foreground)] border border-dashed border-[var(--border)] px-2 py-0.5 rounded-full hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors flex items-center gap-1"
                  >
                    <Plus className="h-2.5 w-2.5" /> {c}
                  </button>
                ) : null
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Options devis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--primary)]" />
            Options devis &amp; factures
          </CardTitle>
          <CardDescription className="text-xs">
            Champs et comportements activés sur les formulaires de création
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <SwitchRow
              label="Référence interne"
              sub="Champ 'Réf. interne' sur le devis"
              checked={showInternalRef}
              onChange={setShowInternalRef}
            />
            <SwitchRow
              label="Réf. commande client"
              sub="Numéro de bon de commande client"
              checked={showClientRef}
              onChange={setShowClientRef}
            />
            <SwitchRow
              label="Délai de livraison"
              sub="Champ texte libre sur le devis"
              checked={showDelivery}
              onChange={setShowDelivery}
            />
            <SwitchRow
              label="Conditions automatiques"
              sub="Pré-remplir avec les conditions du template"
              checked={autoConditions}
              onChange={setAutoConditions}
            />
          </div>

          <div className="flex items-center gap-3 mt-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20">
            <Clock className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Validité par défaut des devis</p>
              <p className="text-xs text-[var(--muted-foreground)]">Nombre de jours après la date d'émission</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={365}
                value={validityDays}
                onChange={(e) => setValidityDays(parseInt(e.target.value) || 30)}
                className="w-20 text-center"
              />
              <span className="text-sm text-[var(--muted-foreground)]">jours</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Devise & Langue */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-[var(--primary)]" />
              Devise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-1.5">
              {CURRENCY_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCurrency(c.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors ${
                    currency === c.value
                      ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)] font-medium"
                      : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                  }`}
                >
                  {currency === c.value && <Check className="h-3.5 w-3.5 shrink-0" />}
                  {c.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-[var(--primary)]" />
              Langue des documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {LANGUAGE_OPTIONS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLanguage(l.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors ${
                    language === l.value
                      ? "border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)] font-medium"
                      : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                  }`}
                >
                  {language === l.value && <Check className="h-3.5 w-3.5 shrink-0" />}
                  {l.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Résumé visuel */}
      <Card className="border-[var(--primary)]/30 bg-[var(--primary)]/3">
        <CardHeader>
          <CardTitle className="text-sm">Récapitulatif de la configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-[var(--muted-foreground)] mb-1 font-medium uppercase text-[10px]">TVA active</p>
              <p className="font-medium">{vatRates.length > 0 ? vatRates.map((r) => `${r}%`).join(", ") : "—"}</p>
            </div>
            <div>
              <p className="text-[var(--muted-foreground)] mb-1 font-medium uppercase text-[10px]">Paiements</p>
              <p className="font-medium">{paymentMethods.length > 0 ? `${paymentMethods.length} mode(s)` : "—"}</p>
            </div>
            <div>
              <p className="text-[var(--muted-foreground)] mb-1 font-medium uppercase text-[10px]">Devise / Langue</p>
              <p className="font-medium">{currency} · {language}</p>
            </div>
            <div>
              <p className="text-[var(--muted-foreground)] mb-1 font-medium uppercase text-[10px]">Unités</p>
              <p className="font-medium">{units.length} unité(s)</p>
            </div>
            <div>
              <p className="text-[var(--muted-foreground)] mb-1 font-medium uppercase text-[10px]">Catégories</p>
              <p className="font-medium">{categories.length} catégorie(s)</p>
            </div>
            <div>
              <p className="text-[var(--muted-foreground)] mb-1 font-medium uppercase text-[10px]">Validité devis</p>
              <p className="font-medium">{validityDays} jours</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending || vatRates.length === 0} className="w-full">
        {isPending ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Sauvegarde...</>
        ) : saved ? (
          <><Check className="h-4 w-4" /> Préférences sauvegardées !</>
        ) : (
          "Enregistrer les préférences"
        )}
      </Button>
    </form>
  );
}
