"use client";

import { useState, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateQuoteTemplate, updateCompanyLogo, removeCompanyLogo } from "@/actions/company";
import { PRESET_CONDITIONS } from "@/lib/quote-conditions";
import {
  Palette, Type, Image, FileText, CreditCard, Check, Upload, Trash2, Eye,
  ChevronDown, Loader2,
} from "lucide-react";

const FONTS = [
  { value: "Helvetica", label: "Helvetica (moderne, sans-serif)" },
  { value: "Times-Roman", label: "Times Roman (classique, serif)" },
  { value: "Courier", label: "Courier (monospace, technique)" },
];

const COLORS = [
  { value: "#2563eb", label: "Bleu" },
  { value: "#0891b2", label: "Cyan" },
  { value: "#059669", label: "Vert" },
  { value: "#7c3aed", label: "Violet" },
  { value: "#dc2626", label: "Rouge" },
  { value: "#ea580c", label: "Orange" },
  { value: "#0f172a", label: "Ardoise" },
  { value: "#374151", label: "Gris" },
];

interface TemplateEditorProps {
  company: {
    tplColor: string;
    tplFont: string;
    tplLogo: string | null;
    tplFooter: string | null;
    tplConditions: string | null;
    tplShowBank: boolean;
    name: string;
    vatNumber: string | null;
    iban: string | null;
    bic: string | null;
  };
}

export function TemplateEditor({ company }: TemplateEditorProps) {
  const [color, setColor] = useState(company.tplColor || "#2563eb");
  const [font, setFont] = useState(company.tplFont || "Helvetica");
  const [footer, setFooter] = useState(company.tplFooter || "");
  const [conditions, setConditions] = useState(company.tplConditions || "");
  const [showBank, setShowBank] = useState(company.tplShowBank);
  const [logo, setLogo] = useState<string | null>(company.tplLogo);
  const [saved, setSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePreset(value: string) {
    setConditions(value);
  }

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert("Logo trop volumineux (max 1 Mo)");
      return;
    }
    setUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      setLogo(base64);
      await updateCompanyLogo(base64);
      setUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  }

  async function handleRemoveLogo() {
    setLogo(null);
    await removeCompanyLogo();
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("tplColor", color);
    fd.append("tplFont", font);
    fd.append("tplFooter", footer);
    fd.append("tplConditions", conditions);
    fd.append("tplShowBank", showBank ? "true" : "false");
    startTransition(async () => {
      await updateQuoteTemplate(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Preview band */}
      <div
        className="rounded-lg p-4 text-white flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${color}dd, ${color})` }}
      >
        <div className="flex items-center gap-3">
          {logo ? (
            <img src={logo} alt="Logo" className="h-10 w-auto object-contain bg-white rounded p-1" />
          ) : (
            <div className="h-10 w-10 bg-white/20 rounded flex items-center justify-center text-xs font-bold">
              {company.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-bold text-sm" style={{ fontFamily: font === "Times-Roman" ? "Georgia, serif" : font === "Courier" ? "monospace" : "sans-serif" }}>
              {company.name}
            </p>
            <p className="text-xs opacity-75">{company.vatNumber}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">DEVIS</p>
          <p className="text-sm opacity-75">DEV-001</p>
        </div>
      </div>

      {/* Color */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="h-4 w-4" style={{ color }} />
            Couleur principale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => setColor(c.value)}
                className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                style={{
                  backgroundColor: c.value,
                  borderColor: color === c.value ? "#000" : "transparent",
                }}
              >
                {color === c.value && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Label className="shrink-0 text-xs text-[var(--muted-foreground)]">Couleur personnalisée</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-[var(--border)]"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-28 font-mono text-xs h-8"
                placeholder="#2563eb"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Font */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Type className="h-4 w-4" />
            Police
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {FONTS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFont(f.value)}
                className={`border rounded-lg p-3 text-left transition-colors ${
                  font === f.value
                    ? "border-[var(--primary)] bg-blue-50"
                    : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                }`}
              >
                <p
                  className="text-lg mb-1"
                  style={{
                    fontFamily:
                      f.value === "Times-Roman"
                        ? "Georgia, serif"
                        : f.value === "Courier"
                        ? "monospace"
                        : "sans-serif",
                  }}
                >
                  Aa
                </p>
                <p className="text-xs text-[var(--muted-foreground)] leading-tight">{f.label}</p>
                {font === f.value && (
                  <Badge className="mt-1 text-xs" variant="secondary">Actif</Badge>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Image className="h-4 w-4" />
            Logo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {logo ? (
            <div className="flex items-center gap-4">
              <div className="border border-[var(--border)] rounded-lg p-2 bg-[var(--muted)]/30">
                <img src={logo} alt="Logo" className="h-16 w-auto object-contain max-w-[200px]" />
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-3 w-3" />
                  Changer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleRemoveLogo}
                >
                  <Trash2 className="h-3 w-3" />
                  Supprimer
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-[var(--border)] rounded-lg p-8 text-center hover:border-[var(--primary)] hover:bg-blue-50/50 transition-colors"
            >
              {uploadingLogo ? (
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-[var(--primary)]" />
              ) : (
                <Upload className="h-6 w-6 mx-auto mb-2 text-[var(--muted-foreground)]" />
              )}
              <p className="text-sm font-medium">Cliquez pour uploader votre logo</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">PNG, JPG, SVG — max 1 Mo</p>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoFile}
          />
        </CardContent>
      </Card>

      {/* Footer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Pied de page personnalisé
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-[var(--muted-foreground)]">
            Aparaît en bas de chaque page du PDF. Si vide, le numéro de TVA est utilisé.
          </p>
          <Input
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            placeholder={`${company.name} — ${company.vatNumber || "BE 0000.000.000"} — IBAN: ${company.iban || "BE00 0000 0000 0000"}`}
          />
        </CardContent>
      </Card>

      {/* Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Conditions de vente par défaut
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-[var(--muted-foreground)]">Charger un modèle pré-rédigé</Label>
            <div className="relative">
              <select
                className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-[var(--background)] appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) handlePreset(e.target.value);
                }}
              >
                <option value="">— Choisir un modèle —</option>
                {PRESET_CONDITIONS.map((p) => (
                  <option key={p.label} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 pointer-events-none text-[var(--muted-foreground)]" />
            </div>
          </div>
          <Textarea
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            rows={10}
            placeholder="Saisissez vos conditions de vente ou choisissez un modèle ci-dessus..."
            className="text-xs leading-relaxed"
          />
          <p className="text-xs text-[var(--muted-foreground)]">
            Ces conditions seront pré-remplies lors de la création d'un nouveau devis. Vous pouvez les modifier par devis.
          </p>
        </CardContent>
      </Card>

      {/* Bank details toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Coordonnées bancaires sur le PDF
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setShowBank(!showBank)}
              className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                showBank ? "bg-[var(--primary)]" : "bg-[var(--muted)]"
              }`}
            >
              <div
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  showBank ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </div>
            <div>
              <p className="text-sm font-medium">
                {showBank ? "Afficher les coordonnées bancaires" : "Masquer les coordonnées bancaires"}
              </p>
              {company.iban && (
                <p className="text-xs text-[var(--muted-foreground)]">IBAN : {company.iban}</p>
              )}
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Sauvegarde...</>
          ) : saved ? (
            <><Check className="h-4 w-4" /> Sauvegardé !</>
          ) : (
            "Sauvegarder le template"
          )}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href="/api/devis/preview-pdf" target="_blank">
            <Eye className="h-4 w-4" /> Prévisualiser
          </a>
        </Button>
      </div>
    </form>
  );
}
