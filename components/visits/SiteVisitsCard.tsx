"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarCheck, CheckCircle2, MapPin, UserRound, XCircle } from "lucide-react";
import type { SiteVisitStatus } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VISIT_STATUS_BADGE, VISIT_STATUS_LABELS } from "./constants";
import { VisitStatusDialog } from "./VisitStatusDialog";

export type LeadSiteVisit = {
  id: string;
  scheduledAt: string;
  location: string;
  status: SiteVisitStatus;
  note: string | null;
  agent: { name: string };
};

type ResolvableStatus = Extract<SiteVisitStatus, "COMPLETED" | "CANCELLED" | "NO_SHOW">;

export function SiteVisitsCard({
  visits,
  canManage,
}: {
  visits: LeadSiteVisit[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<{ visitId: string; status: ResolvableStatus } | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-7 items-center justify-center rounded-md bg-accent text-primary">
            <CalendarCheck className="size-4" />
          </span>
          Site visits
        </CardTitle>
      </CardHeader>
      <CardContent>
        {visits.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No visits scheduled yet. Use the &quot;Schedule visit&quot; quick action above.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visits.map((visit) => {
              const when = new Date(visit.scheduledAt);
              return (
                <li key={visit.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center">
                  <div className="w-32 shrink-0">
                    <p className="text-sm font-semibold">
                      {when.toLocaleDateString("en-BD", { day: "2-digit", month: "short" })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {when.toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-sm">
                      <MapPin className="size-3 shrink-0 text-muted-foreground" />
                      {visit.location}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <UserRound className="size-3 shrink-0" />
                      {visit.agent.name}
                    </p>
                    {visit.note && (
                      <p className="mt-0.5 text-xs whitespace-pre-wrap text-muted-foreground">{visit.note}</p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 text-xs", VISIT_STATUS_BADGE[visit.status])}
                  >
                    {VISIT_STATUS_LABELS[visit.status]}
                  </Badge>
                  {canManage && visit.status === "SCHEDULED" && (
                    <div className="flex shrink-0 gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Complete"
                        onClick={() => setPending({ visitId: visit.id, status: "COMPLETED" })}
                      >
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Cancel"
                        onClick={() => setPending({ visitId: visit.id, status: "CANCELLED" })}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="No-show"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setPending({ visitId: visit.id, status: "NO_SHOW" })}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      {pending && (
        <VisitStatusDialog
          visitId={pending.visitId}
          status={pending.status}
          open={!!pending}
          onOpenChange={(open) => !open && setPending(null)}
          onDone={() => router.refresh()}
        />
      )}
    </Card>
  );
}
