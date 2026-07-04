import Link from "next/link";
import { addDays } from "date-fns";
import { CalendarCheck, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { startOfToday } from "@/lib/payment-status";
import { VISIT_STATUS_BADGE, VISIT_STATUS_LABELS } from "@/components/visits/constants";

export async function TodaysVisitsWidget({ tenantId }: { tenantId: string }) {
  const todayStart = startOfToday();
  const visits = await prisma.siteVisit.findMany({
    where: { tenantId, scheduledAt: { gte: todayStart, lt: addDays(todayStart, 1) } },
    orderBy: { scheduledAt: "asc" },
    take: 5,
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      lead: { select: { id: true, name: true } },
      agent: { select: { name: true } },
    },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-7 items-center justify-center rounded-md bg-accent text-primary">
            <CalendarCheck className="size-4" />
          </span>
          Today&apos;s site visits
        </CardTitle>
        <Link
          href="/visits"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {visits.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No visits scheduled today.</p>
        ) : (
          <ul className="divide-y divide-border">
            {visits.map((visit) => (
              <li key={visit.id}>
                <Link
                  href={`/leads/${visit.lead.id}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
                >
                  <span className="w-16 shrink-0 text-sm font-semibold">
                    {new Date(visit.scheduledAt).toLocaleTimeString("en-BD", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{visit.lead.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{visit.agent.name}</p>
                  </div>
                  <Badge variant="outline" className={cn("shrink-0 text-xs", VISIT_STATUS_BADGE[visit.status])}>
                    {VISIT_STATUS_LABELS[visit.status]}
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
