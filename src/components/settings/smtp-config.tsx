"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { updateSmtpConfig } from "@/actions/company";
import { Mail, Eye, EyeOff, CheckCircle, Loader2, Info } from "lucide-react";

interface SmtpConfigProps {
  initial: {
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
  { label: "Outlook / Office 365", host: "smtp.office365.com", port: 587, secure: false },
  { label: "OVH", host: "ssl0.ovh.net", port: 465, secure: true },
  { label: "Mailtrap (test)", host: "sandbox.smtp.mailtrap.io", port: 2525, secure: false },
];

export function SmtpConfig({ initial }: SmtpConfigProps) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [showPass, setShowPass] = useState(false);
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
    fd.set("smtpSecure", secure ? "true" : "false");
    setSaved(false);
    startTransition(async () => {
      await updateSmtpConfig(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[var(--primary)]" />
            Configuration email (SMTP)
          </CardTitle>
          <CardDescription>
            Configurez votre adresse email pour envoyer les devis et factures directement depuis l'application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Choix rapide fournisseur */}
          <div className="space-y-2">
            <Label>Fournisseur email</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    host === p.host
                      ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                      : "border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Adresse email */}
          <div className="space-y-2">
            <Label htmlFor="smtpUser">Votre adresse email *</Label>
            <Input
              id="smtpUser"
              name="smtpUser"
              type="email"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="votre@email.com"
              required
            />
            <p className="text-xs text-[var(--muted-foreground)]">C'est l'adresse depuis laquelle les emails seront envoyés.</p>
          </div>

          {/* Nom affiché */}
          <div className="space-y-2">
            <Label htmlFor="smtpFrom">Nom affiché (optionnel)</Label>
            <Input
              id="smtpFrom"
              name="smtpFrom"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="Nom Société"
            />
            <p className="text-xs text-[var(--muted-foreground)]">Le nom qui apparaît comme expéditeur dans la boîte mail du client.</p>
          </div>

          {/* Mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="smtpPass">Mot de passe *</Label>
            <div className="relative">
              <Input
                id="smtpPass"
                name="smtpPass"
                type={showPass ? "text" : "password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Mot de passe ou mot de passe d'application"
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {user.includes("gmail") && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Pour Gmail, utilisez un <strong>mot de passe d'application</strong> (pas votre mot de passe habituel).{" "}
                  <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    Créer un mot de passe d'application →
                  </a>
                </span>
              </div>
            )}
          </div>

          {/* Serveur SMTP (avancé) */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] select-none">
              ▸ Paramètres avancés (serveur SMTP)
            </summary>
            <div className="mt-3 space-y-3 pl-4 border-l-2 border-[var(--border)]">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">Serveur SMTP</Label>
                  <Input id="smtpHost" name="smtpHost" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">Port</Label>
                  <Input id="smtpPort" name="smtpPort" type="number" value={port} onChange={(e) => setPort(e.target.value)} placeholder="587" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="smtpSecure"
                  checked={secure}
                  onChange={(e) => setSecure(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)]"
                />
                <Label htmlFor="smtpSecure" className="font-normal">Connexion sécurisée SSL/TLS (port 465)</Label>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</> : "Enregistrer la configuration"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" /> Configuration sauvegardée !
          </span>
        )}
      </div>
    </form>
  );
}
