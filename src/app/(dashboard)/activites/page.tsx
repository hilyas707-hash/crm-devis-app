import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, ACTIVITY_TYPE_LABELS } from "@/lib/utils";
import { Phone, Mail, Users, CheckSquare, FileText } from "lucide-react";
import Link from "next/link";

const typeIcons: Record<string, any> = {
  CALL: Phone, EMAIL: Mail, MEETING: Users, TASK: CheckSquare, NOTE: FileText,
};

export default async function ActivitesPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const companyId = (session?.user as any)?.companyId;

  const activities = await prisma.activity.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { client: true, quote: true, invoice: true, deal: true },
  });

  return (
    <div>
      <Header title="Activités" />
      <div className="p-6">
        <div className="space-y-3">
          {activities.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-[var(--muted-foreground)]">
                Aucune activité enregistrée.
              </CardContent>
            </Card>
          ) : (
            activities.map((activity) => {
              const Icon = typeIcons[activity.type] || FileText;
              return (
                <Card key={activity.id}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <Icon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <Badge variant="secondary" className="text-xs">{ACTIVITY_TYPE_LABELS[activity.type]}</Badge>
                        {activity.done && <Badge variant="success" className="text-xs">Fait</Badge>}
                      </div>
                      {activity.description && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{activity.description}</p>}
                      <div className="flex gap-3 mt-1 text-xs text-[var(--muted-foreground)]">
                        {activity.client && <Link href={`/clients/${activity.client.id}`} className="hover:text-[var(--primary)]">{activity.client.name}</Link>}
                        {activity.dueDate && <span>Échéance: {formatDate(activity.dueDate)}</span>}
                        <span>{formatDate(activity.createdAt)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
