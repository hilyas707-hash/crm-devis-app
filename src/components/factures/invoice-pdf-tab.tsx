"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Download, Send, Loader2, CheckCircle, AlertCircle,
  ExternalLink, Mail, FileText, Smartphone,
} from "lucide-react";

interface InvoicePDFTabProps {
  invoiceId: string;
  invoiceNumber: string;
  clientEmail?: string | null;
  companyName: string;
  total: number;
  emailMode?: "SMTP" | "MAILTO";
}

export function InvoicePDFTab({
  invoiceId, invoiceNumber, clientEmail, companyName, total, emailMode = "SMTP",
}: InvoicePDFTabProps) {
  const mountKey = useRef(Date.now()).current;
  const [activeView, setActiveView] = useState<"preview" | "email">("preview");
  const [emailTo, setEmailTo] = useState(clientEmail || "");
  const [subject, setSubject] = useState(`Facture ${invoiceNumber} — ${companyName}`);
  const [message, setMessage] = useState(
    `Bonjour,\n\nVeuillez trouver ci-joint notre facture ${invoiceNumber} d'un montant de ${total.toFixed(2)} €.\n\nMerci de procéder au règlement dans les délais convenus.\n\nCordialement,\n${companyName}`
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const pdfUrl = `/api/factures/${invoiceId}/pdf?t=${mountKey}`;

  async function handleSmtpSend() {
    if (!emailTo) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/factures/${invoiceId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailTo, subject, message }),
      });
      const json = await res.json();
      setResult(res.ok
        ? { ok: true, msg: `Email envoyé à ${emailTo}` }
        : { ok: false, msg: json.error || "Erreur lors de l'envoi" }
      );
    } catch {
      setResult({ ok: false, msg: "Erreur réseau" });
    } finally {
      setSending(false);
    }
  }

  function handleMailtoSend() {
    if (!emailTo) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `facture-${invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      const mailtoLink = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      window.location.href = mailtoLink;
    }, 600);

    setResult({
      ok: true,
      msg: `Le PDF facture-${invoiceNumber}.pdf a été téléchargé. Votre application email va s'ouvrir — attachez le fichier avant d'envoyer.`,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-[var(--border)] pb-2">
        <button onClick={() => setActiveView("preview")}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-t font-medium transition-colors ${
            activeView === "preview" ? "bg-[var(--primary)] text-white" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}>
          <FileText className="h-4 w-4" /> Aperçu PDF
        </button>
        <button onClick={() => { setActiveView("email"); setResult(null); }}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-t font-medium transition-colors ${
            activeView === "email" ? "bg-[var(--primary)] text-white" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}>
          <Mail className="h-4 w-4" /> Envoyer par email
        </button>
      </div>

      {activeView === "preview" && (
        <div className="space-y-3">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" asChild>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> Ouvrir dans un onglet
              </a>
            </Button>
            <Button asChild>
              <a href={pdfUrl} download={`facture-${invoiceNumber}.pdf`}>
                <Download className="h-4 w-4" /> Télécharger PDF
              </a>
            </Button>
          </div>
          <div className="border border-[var(--border)] rounded-xl overflow-hidden" style={{ height: "700px" }}>
            <iframe src={pdfUrl} width="100%" height="100%" title={`Facture ${invoiceNumber}`} className="block" />
          </div>
        </div>
      )}

      {activeView === "email" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {emailMode === "MAILTO"
                ? <><Smartphone className="h-4 w-4 text-violet-500" /> Envoyer via votre app email</>
                : <><Mail className="h-4 w-4 text-[var(--primary)]" /> Envoyer la facture par email</>
              }
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {emailMode === "MAILTO" ? (
              <div className="flex items-start gap-2 p-3 bg-violet-50 border border-violet-200 rounded-lg text-xs text-violet-700">
                <Smartphone className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Mode App email :</strong> le PDF sera téléchargé automatiquement, puis votre application email s'ouvrira avec tout pré-rempli.
                  Vous n'aurez qu'à attacher le fichier téléchargé et envoyer.
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 bg-[var(--muted)]/40 rounded-lg text-xs text-[var(--muted-foreground)]">
                <Mail className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Le PDF de la facture sera automatiquement joint à l'email.</span>
              </div>
            )}

            {result && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                result.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {result.ok ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                <span>{result.msg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email-to" className="text-xs font-medium text-[var(--muted-foreground)]">
                Destinataire <span className="text-red-500">*</span>
              </Label>
              <Input id="email-to" type="email" value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)} placeholder="client@exemple.com" className="h-9" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email-subject" className="text-xs font-medium text-[var(--muted-foreground)]">Sujet</Label>
              <Input id="email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email-message" className="text-xs font-medium text-[var(--muted-foreground)]">Message</Label>
              <Textarea id="email-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={8} className="resize-none text-sm" />
            </div>

            <Button
              onClick={emailMode === "MAILTO" ? handleMailtoSend : handleSmtpSend}
              disabled={sending || !emailTo}
              className={`w-full gap-2 ${emailMode === "MAILTO" ? "bg-violet-600 hover:bg-violet-700" : ""}`}
            >
              {sending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours…</>
              ) : emailMode === "MAILTO" ? (
                <><Smartphone className="h-4 w-4" /> Télécharger PDF et ouvrir l'app email</>
              ) : (
                <><Send className="h-4 w-4" /> Envoyer l'email avec le PDF</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
