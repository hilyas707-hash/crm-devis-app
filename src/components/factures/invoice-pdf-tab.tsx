"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Send, Loader2, CheckCircle, AlertCircle, ExternalLink, Mail, FileText } from "lucide-react";

interface InvoicePDFTabProps {
  invoiceId: string;
  invoiceNumber: string;
  clientEmail?: string | null;
  companyName: string;
  total: number;
}

export function InvoicePDFTab({ invoiceId, invoiceNumber, clientEmail, companyName, total }: InvoicePDFTabProps) {
  const [activeView, setActiveView] = useState<"preview" | "email">("preview");
  const [emailTo, setEmailTo] = useState(clientEmail || "");
  const [subject, setSubject] = useState(`Facture ${invoiceNumber} — ${companyName}`);
  const [message, setMessage] = useState(
    `Bonjour,\n\nVeuillez trouver ci-joint notre facture ${invoiceNumber} d'un montant de ${total.toFixed(2)} €.\n\nMerci de procéder au règlement dans les délais convenus.\n\nCordialement,\n${companyName}`
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const pdfUrl = `/api/factures/${invoiceId}/pdf`;

  async function handleSendEmail() {
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
        ? { ok: true, msg: `Email envoyé avec succès à ${emailTo}` }
        : { ok: false, msg: json.error || "Erreur lors de l'envoi" }
      );
    } catch {
      setResult({ ok: false, msg: "Erreur réseau" });
    } finally {
      setSending(false);
    }
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
        <button onClick={() => setActiveView("email")}
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
          <div className="border border-[var(--border)] rounded-lg overflow-hidden" style={{ height: "700px" }}>
            <iframe src={pdfUrl} width="100%" height="100%" title={`Facture ${invoiceNumber}`} className="block" />
          </div>
        </div>
      )}

      {activeView === "email" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-[var(--primary)]" /> Envoyer la facture par email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-[var(--muted)]/40 rounded text-sm text-[var(--muted-foreground)]">
              Le PDF de la facture sera automatiquement joint à l'email.
            </div>
            {result && (
              <div className={`flex items-center gap-2 p-3 rounded text-sm ${result.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {result.ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                {result.msg}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email-to">Destinataire *</Label>
              <Input id="email-to" type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="client@exemple.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-subject">Sujet *</Label>
              <Input id="email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-message">Message</Label>
              <Textarea id="email-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={8} />
            </div>
            <Button onClick={handleSendEmail} disabled={sending || !emailTo} className="w-full">
              {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours...</> : <><Send className="h-4 w-4" /> Envoyer l'email avec le PDF</>}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
