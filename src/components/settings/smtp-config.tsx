"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { updateUserSmtp } from "@/actions/user";
import {
  Mail, Eye, EyeOff, CheckCircle, Loader2, Info, X,
  Server, Smartphone, Zap, ShieldCheck, WifiOff,
} from "lucide-react";

interface SmtpConfigProps {
  initial: {
    emailMode: string;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUser: string | null;
    smtpPass: string | null;
    smtpSecure: boolean;
    smtpFrom: string | null;
  };
}

const PRESETS = [
  { label: "Gmail", host: "smtp.gmail.com", port: 587, secure: false },
  { label: "Outlook / 365", host: "smtp.office365.com", port: 587, secure: false },
  { label: "OVH", host: "ssl0.ovh.net", port: 465, secure: true },
  { label: "Mailtrap (test)", host: "sandbox.smtp.mailtrap.io", port: 2525, secure: false },
];

type InfoModal = "smtp" | "mailto" | null;

export function SmtpConfig({ initial }: SmtpConfigProps) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [emailMode, setEmailMode] = useState<"SMTP" | "MAILTO">(
    (initial.emailMode as "SMTP" | "MAILTO") || "SMTP"
  );
  const [modal, setModal] = useState<InfoModal>(null);
  const [host, setHost] = useState(initial.smtpHost || "");
  const [port, setPort] = useState(initial.smtpPort?.toString() || "587");
  const [secure, setSecure] = useState(initial.smtpSecure);
  const [user, setUser] = useState(initial.smtpUser || "");
  const [pass, setPass] = useState(initial.smtpPass || "");
  const [from, setFrom] = useState(initial.smtpFrom || "");

  function applyPreset(preset: typeof PRESETS[number]) {
    setHost(preset.host);
    setPort(preset.port.toString());
    setSecure(preset.secure);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("emailMode", emailMode);
    fd.set("smtpSecure", secure ? "true" : "false");
    setSaved(false);
    startTransition(async () => {
      await updateUserSmtp(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <>
      {/* Modal d'information */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {modal === "smtp"
                  ? <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center"><Server className="h-5 w-5 text-blue-600" /></div>
                  : <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center"><Smartphone className="h-5 w-5 text-violet-600" /></div>
                }
                <div>
                  <h3 className="font-bold text-base">{modal === "smtp" ? "Mode SMTP — Envoi depuis l'app" : "Mode App email — Ouverture native"}</h3>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {modal === "smtp" ? (
              <div className="space-y-3 text-sm">
                <p className="text-[var(--muted-foreground)]">
                  L'application envoie l'email <strong>directement depuis ses serveurs</strong> en utilisant votre compte email (Gmail, Outlook, OVH…).
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-emerald-700">
                    <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Envoi en un clic depuis le devis ou la facture</span>
                  </div>
                  <div className="flex items-start gap-2 text-emerald-700">
                    <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Le PDF est automatiquement joint à l'email</span>
                  </div>
                  <div className="flex items-start gap-2 text-emerald-700">
                    <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Fonctionne sur ordinateur, téléphone et tablette</span>
                  </div>
                  <div className="flex items-start gap-2 text-amber-600">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Nécessite de configurer votre mot de passe email (ou mot de passe d'application pour Gmail)</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                  Recommandé si vous utilisez souvent l'app pour envoyer des devis/factures.
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <p className="text-[var(--muted-foreground)]">
                  L'application <strong>télécharge le PDF</strong> et <strong>ouvre votre application email</strong> (Gmail, Outlook, Apple Mail, etc.) avec le sujet et le message déjà pré-remplis.
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-emerald-700">
                    <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Aucune configuration requise — fonctionne immédiatement</span>
                  </div>
                  <div className="flex items-start gap-2 text-emerald-700">
                    <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Idéal sur mobile : ouvre directement l'app email du téléphone</span>
                  </div>
                  <div className="flex items-start gap-2 text-emerald-700">
                    <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Votre mot de passe email reste privé, jamais stocké</span>
                  </div>
                  <div className="flex items-start gap-2 text-amber-600">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Le PDF se télécharge d'abord — vous devez l'attacher manuellement dans votre app email</span>
                  </div>
                </div>
                <div className="p-3 bg-violet-50 rounded-lg text-xs text-violet-700">
                  Recommandé si vous préférez garder le contrôle de vos envois depuis votre propre boîte mail.
                </div>
              </div>
            )}

            <Button className="w-full" onClick={() => {
              setEmailMode(modal === "smtp" ? "SMTP" : "MAILTO");
              setModal(null);
            }}>
              Choisir ce mode
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

        {/* Sélecteur de mode */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Mail className="h-4 w-4 text-[var(--primary)]" />
              Mode d&apos;envoi des emails
            </CardTitle>
            <CardDescription className="text-xs">
              Choisissez comment l&apos;application envoie vos devis et factures par email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* Option SMTP */}
              <div
                onClick={() => setEmailMode("SMTP")}
                className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                  emailMode === "SMTP"
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-[var(--border)] hover:border-blue-300 bg-white"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Server className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setModal("smtp"); }}
                      className="h-6 w-6 rounded-full flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors" title="En savoir plus">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                    <div className={`h-4 w-4 rounded-full border-2 transition-all ${
                      emailMode === "SMTP" ? "border-blue-500 bg-blue-500" : "border-[var(--border)]"
                    }`}>
                      {emailMode === "SMTP" && <div className="h-full w-full rounded-full bg-white scale-50 block" />}
                    </div>
                  </div>
                </div>
                <p className="font-semibold text-sm">Envoi depuis l&apos;app</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
                  Envoie directement via votre compte email. PDF attaché automatiquement.
                </p>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                  <Zap className="h-3 w-3" /> Envoi en 1 clic
                </div>
              </div>

              {/* Option MAILTO */}
              <div
                onClick={() => setEmailMode("MAILTO")}
                className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                  emailMode === "MAILTO"
                    ? "border-violet-500 bg-violet-50 shadow-sm"
                    : "border-[var(--border)] hover:border-violet-300 bg-white"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="h-9 w-9 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-violet-600" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setModal("mailto"); }}
                      className="h-6 w-6 rounded-full flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors" title="En savoir plus">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                    <div className={`h-4 w-4 rounded-full border-2 transition-all ${
                      emailMode === "MAILTO" ? "border-violet-500 bg-violet-500" : "border-[var(--border)]"
                    }`}>
                      {emailMode === "MAILTO" && <div className="h-full w-full rounded-full bg-white scale-50 block" />}
                    </div>
                  </div>
                </div>
                <p className="font-semibold text-sm">App email native</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
                  Ouvre votre app email (Gmail, Mail, Outlook) avec tout pré-rempli.
                </p>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-violet-600 font-medium">
                  <ShieldCheck className="h-3 w-3" /> Aucune config requise
                </div>
              </div>

            </div>
            <input type="hidden" name="emailMode" value={emailMode} />
          </CardContent>
        </Card>

        {/* Config SMTP — visible seulement si mode SMTP */}
        {emailMode === "SMTP" && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Configuration SMTP</CardTitle>
              <CardDescription className="text-xs">
                Entrez vos identifiants email pour permettre l&apos;envoi depuis l&apos;application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Presets fournisseurs */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-[var(--muted-foreground)]">Votre fournisseur email</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button key={p.label} type="button" onClick={() => applyPreset(p)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                        host === p.host
                          ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
                          : "border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Adresse email */}
              <div className="space-y-1.5">
                <Label htmlFor="smtpUser" className="text-xs font-medium text-[var(--muted-foreground)]">
                  Votre adresse email <span className="text-red-500">*</span>
                </Label>
                <Input id="smtpUser" name="smtpUser" type="email" value={user}
                  onChange={(e) => setUser(e.target.value)} placeholder="votre@email.com" required className="h-9" />
              </div>

              {/* Nom affiché */}
              <div className="space-y-1.5">
                <Label htmlFor="smtpFrom" className="text-xs font-medium text-[var(--muted-foreground)]">Nom affiché</Label>
                <Input id="smtpFrom" name="smtpFrom" value={from}
                  onChange={(e) => setFrom(e.target.value)} placeholder="Mon Entreprise" className="h-9" />
                <p className="text-[10px] text-[var(--muted-foreground)]">Le nom visible dans la boîte mail du client.</p>
              </div>

              {/* Mot de passe */}
              <div className="space-y-1.5">
                <Label htmlFor="smtpPass" className="text-xs font-medium text-[var(--muted-foreground)]">
                  Mot de passe <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input id="smtpPass" name="smtpPass" type={showPass ? "text" : "password"}
                    value={pass} onChange={(e) => setPass(e.target.value)}
                    placeholder="Mot de passe ou mot de passe d'application"
                    className="h-9 pr-10" required />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {user.toLowerCase().includes("gmail") && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Pour Gmail, utilisez un <strong>mot de passe d&apos;application</strong> (pas votre mot de passe habituel).{" "}
                      <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                        Créer un mot de passe d&apos;application →
                      </a>
                    </span>
                  </div>
                )}
              </div>

              {/* Serveur SMTP — avancé */}
              <details className="group">
                <summary className="cursor-pointer text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] select-none flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
                  Paramètres serveur avancés
                </summary>
                <div className="mt-3 space-y-3 pl-4 border-l-2 border-[var(--border)]">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="smtpHost" className="text-xs">Serveur SMTP</Label>
                      <Input id="smtpHost" name="smtpHost" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="smtpPort" className="text-xs">Port</Label>
                      <Input id="smtpPort" name="smtpPort" type="number" value={port} onChange={(e) => setPort(e.target.value)} placeholder="587" className="h-8 text-sm" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} className="h-4 w-4 rounded" />
                    <span className="text-sm">Connexion SSL/TLS (port 465)</span>
                  </label>
                </div>
              </details>
            </CardContent>
          </Card>
        )}

        {/* Résumé mode MAILTO */}
        {emailMode === "MAILTO" && (
          <Card className="border-violet-200 bg-violet-50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                  <Smartphone className="h-4 w-4 text-violet-600" />
                </div>
                <div className="text-sm space-y-1">
                  <p className="font-semibold text-violet-900">Mode App email activé</p>
                  <p className="text-violet-700 text-xs leading-relaxed">
                    Depuis chaque devis ou facture, un bouton téléchargera le PDF et ouvrira votre application email avec le destinataire, le sujet et le message déjà remplis.
                    Vous n&apos;aurez qu&apos;à attacher le PDF et envoyer.
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-violet-600 mt-2">
                    <WifiOff className="h-3 w-3" />
                    Aucune configuration email requise — vos identifiants restent privés
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending} className="gap-2">
            {pending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
            ) : (
              "Enregistrer la configuration"
            )}
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" /> Sauvegardé !
            </span>
          )}
        </div>
      </form>
    </>
  );
}
