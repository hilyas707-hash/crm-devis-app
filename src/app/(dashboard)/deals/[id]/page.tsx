import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, DEAL_STAGE_LABELS } from "@/lib/utils";
import { updateDeal, deleteDeal, updateDealStage } from "@/actions/deals";
import { Edit, Trash2, TrendingUp, Calendar, User, Target } from "lucide-react";
import Link from "next/link";

const STAGES = [
  { value: "PROSPECTION", label: "Prospection", color: "bg-slate-100 text-slate-700 border-slate-300" },
  { value: "QUALIFICATION", label: "Qualification", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "PROPOSITION", label: "Proposition", color: "bg-violet-100 text-violet-700 border-violet-300" },
  { value: "NEGOCIATION", label: "Négociation", color: "bg-amber-100 text-amber-700 border-amber-300" },
  { value: "GAGNE", label: "Gagné", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "PERDU", label: "Perdu", color: "bg-red-100 text-red-700 border-red-300" },
];

const stageBadge: Record<string, any> = {
  PROSPECTION: "secondary", QUALIFICATION: "info", PROPOSITION: "purple",
  NEGOCIATION: "warning", GAGNE: "success", PERDU: "destructive",
};

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;

  const [deal, clients] = await Promise.all([
    prisma.deal.findFirst({
      where: { id, client: { companyId } },
      include: { client: true, activities: { orderBy: { createdAt: "desc" }, take: 5 } },
    }),
    prisma.client.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
  ]);

  if (!deal) notFound();

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateDeal(id, formData);
  }

  async function handleDelete() {
    "use server";
    await deleteDeal(id);
  }

  return (
    <div>
      <Header />
      <div className="p-4 md:p-6 max-w-4xl space-y-6">

        {/* En-tête */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{deal.title}</h1>
              <Badge variant={stageBadge[deal.stage]}>{DEAL_STAGE_LABELS[deal.stage]}</Badge>
            </div>
            <Link href={`/clients/${deal.client.id}`} className="text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)] flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> {deal.client.name}
            </Link>
          </div>
          <div className="flex gap-2 shrink-0">
            <form action={handleDelete}>
              <Button type="submit" variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={(e) => { if (!confirm("Supprimer cette opportunité ?")) e.preventDefault(); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Progression des étapes */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {STAGES.map((stage) => (
            <form key={stage.value} action={updateDealStage.bind(null, id, stage.value)}>
              <button type="submit"
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                  deal.stage === stage.value
                    ? stage.color + " shadow-sm scale-105"
                    : "bg-white border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)]"
                }`}>
                {stage.label}
              </button>
            </form>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Formulaire d'édition */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Edit className="h-4 w-4" /> Modifier l&apos;opportunité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={handleUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titre *</Label>
                    <Input id="title" name="title" defaultValue={deal.title} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client *</Label>
                    <select name="clientId" defaultValue={deal.clientId} required
                      className="flex h-9 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="value">Valeur estimée (€)</Label>
                      <Input id="value" name="value" type="number" min="0" step="0.01" defaultValue={deal.value} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="probability">Probabilité %</Label>
                      <Input id="probability" name="probability" type="number" min="0" max="100" defaultValue={deal.probability} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stage">Étape</Label>
                      <select name="stage" defaultValue={deal.stage}
                        className="flex h-9 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
                        {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expectedAt">Date de clôture prévue</Label>
                      <Input id="expectedAt" name="expectedAt" type="date"
                        defaultValue={deal.expectedAt?.toISOString().split("T")[0] || ""} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" defaultValue={deal.notes || ""} rows={4} placeholder="Contexte, remarques…" />
                  </div>
                  <Button type="submit">Enregistrer</Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* KPIs */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-[var(--primary)]" />
                  <span className="text-[var(--muted-foreground)]">Valeur estimée</span>
                </div>
                <p className="text-2xl font-bold text-[var(--primary)]">{formatCurrency(deal.value)}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Pondérée : {formatCurrency(deal.value * deal.probability / 100)} ({deal.probability}%)
                </p>
              </CardContent>
            </Card>

            {deal.expectedAt && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    <span className="text-[var(--muted-foreground)]">Clôture prévue</span>
                  </div>
                  <p className="font-semibold">{formatDate(deal.expectedAt)}</p>
                  {new Date(deal.expectedAt) < new Date() && deal.stage !== "GAGNE" && deal.stage !== "PERDU" && (
                    <p className="text-xs text-red-500 mt-1">⚠ Date dépassée</p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm mb-2">
                  <Target className="h-4 w-4 text-emerald-500" />
                  <span className="text-[var(--muted-foreground)]">Probabilité</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-[var(--muted)]">
                    <div className="h-2 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${deal.probability}%` }} />
                  </div>
                  <span className="text-sm font-bold">{deal.probability}%</span>
                </div>
              </CardContent>
            </Card>

            <div className="text-xs text-[var(--muted-foreground)] px-1">
              Créé le {formatDate(deal.createdAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
