import Link from "next/link";
import { Flame, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { displayBDPhone } from "@/lib/bd-phone";
import { formatBDT } from "@/lib/format-bdt";
import { SCORE_BADGE } from "@/components/leads/constants";
import { cn } from "@/lib/utils";

export async function HotLeadsWidget({ tenantId }: { tenantId: string }) {
  const leads = await prisma.lead.findMany({
    where: { tenantId, aiScore: "HOT", pipelineStage: { notIn: ["BOOKED", "LOST"] } },
    orderBy: { aiScoredAt: "desc" },
    take: 5,
    select: { id: true, name: true, phone: true, budgetMax: true, locationArea: true },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-7 items-center justify-center rounded-md bg-red-50 text-red-500 dark:bg-red-950/40">
            <Flame className="size-4" />
          </span>
          Hot leads
        </CardTitle>
        <Link
          href="/leads"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No hot leads yet. Score leads with AI from the lead page.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{lead.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {displayBDPhone(lead.phone)}
                      {lead.locationArea && ` · ${lead.locationArea}`}
                    </p>
                  </div>
                  {lead.budgetMax != null && (
                    <span className="shrink-0 text-xs font-medium text-primary">
                      {formatBDT(lead.budgetMax)}
                    </span>
                  )}
                  <Badge variant="outline" className={cn("shrink-0 text-xs", SCORE_BADGE.HOT)}>
                    HOT
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
