import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, DEAL_STAGE_LABELS } from "@/lib/utils";
import { Plus } from "lucide-react";
import Link from "next/link";

const STAGES = ["PROSPECTION", "QUALIFICATION", "PROPOSITION", "NEGOCIATION", "GAGNE", "PERDU"];

const stageColors: Record<string, string> = {
  PROSPECTION: "bg-slate-100 border-slate-300",
  QUALIFICATION: "bg-blue-50 border-blue-200",
  PROPOSITION: "bg-violet-50 border-violet-200",
  NEGOCIATION: "bg-amber-50 border-amber-200",
  GAGNE: "bg-green-50 border-green-200",
  PERDU: "bg-red-50 border-red-200",
};

const stageBadge: Record<string, any> = {
  PROSPECTION: "secondary",
  QUALIFICATION: "info",
  PROPOSITION: "purple",
  NEGOCIATION: "warning",
  GAGNE: "success",
  PERDU: "destructive",
};

export default async function DealsPage() {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;

  const deals = await prisma.deal.findMany({
    where: { client: { companyId } },
    orderBy: { createdAt: "desc" },
    include: { client: true },
  });

  const byStage = STAGES.reduce((acc, stage) => {
    acc[stage] = deals.filter((d) => d.stage === stage);
    return acc;
  }, {} as Record<string, typeof deals>);

  return (
    <div>
      <Header title="Pipeline commercial" />
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-[var(--muted-foreground)]">{deals.length} opportunité{deals.length !== 1 ? "s" : ""}</p>
          <Button asChild>
            <Link href="/deals/new"><Plus className="h-4 w-4" /> Nouvelle opportunité</Link>
          </Button>
        </div>

        {/* Kanban */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6 overflow-x-auto">
          {STAGES.map((stage) => (
            <div key={stage} className={`rounded-lg border-2 p-3 ${stageColors[stage]}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  {DEAL_STAGE_LABELS[stage]}
                </h3>
                <span className="text-xs font-medium bg-white rounded-full px-2 py-0.5 shadow-sm">
                  {byStage[stage].length}
                </span>
              </div>
              <div className="space-y-2">
                {byStage[stage].length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)] text-center py-4">—</p>
                ) : (
                  byStage[stage].map((deal) => (
                    <Link key={deal.id} href={`/deals/${deal.id}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-3">
                          <p className="text-sm font-medium leading-tight line-clamp-2">{deal.title}</p>
                          <p className="text-xs text-[var(--muted-foreground)] mt-1">{deal.client.name}</p>
                          {deal.value > 0 && (
                            <p className="text-xs font-semibold text-[var(--primary)] mt-1">{formatCurrency(deal.value)}</p>
                          )}
                          <p className="text-xs text-[var(--muted-foreground)] mt-1">{deal.probability}%</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
