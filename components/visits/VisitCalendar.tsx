"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addDays, startOfDay } from "date-fns";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  MapPin,
  UserRound,
  XCircle,
} from "lucide-react";
import type { SiteVisitStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { displayBDPhone } from "@/lib/bd-phone";
import { ScheduleVisitDialog } from "@/components/leads/ScheduleVisitDialog";
import { VISIT_STATUS_BADGE, VISIT_STATUS_LABELS } from "./constants";
import { VisitStatusDialog } from "./VisitStatusDialog";
import type { VisitListItem } from "./types";

type ResolvableStatus = Extract<SiteVisitStatus, "COMPLETED" | "CANCELLED" | "NO_SHOW">;
type PendingAction = { visit: VisitListItem; status: ResolvableStatus };

const GROUP_ORDER = ["Needs update", "Today", "Tomorrow", "This week", "Later"] as const;

function groupUpcoming(visits: VisitListItem[]) {
  const today = startOfDay(new Date());
  const groups = new Map<string, VisitListItem[]>();

  for (const visit of visits) {
    const when = new Date(visit.scheduledAt);
    let key: (typeof GROUP_ORDER)[number];
    if (when < today) key = "Needs update";
    else if (when < addDays(today, 1)) key = "Today";
    else if (when < addDays(today, 2)) key = "Tomorrow";
    else if (when < addDays(today, 7)) key = "This week";
    else key = "Later";

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(visit);
  }
  return groups;
}

export function VisitCalendar({
  visits,
  canManage,
  agents,
  leads,
  currentUserId,
}: {
  visits: VisitListItem[];
  canManage: boolean;
  agents: { id: string; name: string }[];
  leads: { id: string; name: string; locationArea: string | null }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const visibleVisits = useMemo(
    () => (agentFilter ? visits.filter((v) => v.agent.id === agentFilter) : visits),
    [visits, agentFilter]
  );

  const upcoming = useMemo(
    () =>
      groupUpcoming(
        visibleVisits
          .filter((v) => v.status === "SCHEDULED")
          .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      ),
    [visibleVisits]
  );
  const history = useMemo(
    () =>
      visibleVisits
        .filter((v) => v.status !== "SCHEDULED")
        .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)),
    [visibleVisits]
  );

  const upcomingCount = visibleVisits.filter((v) => v.status === "SCHEDULED").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Site visits</h1>
          <p className="text-sm text-muted-foreground">{upcomingCount} upcoming</p>
        </div>
        {canManage && (
          <Button onClick={() => setScheduleOpen(true)}>
            <CalendarPlus className="h-4 w-4" />
            Schedule visit
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => v && setTab(v as "upcoming" | "history")}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({upcomingCount})</TabsTrigger>
            <TabsTrigger value="history">History ({history.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        {agents.length > 0 && (
          <Select
            value={agentFilter ?? "all"}
            onValueChange={(v) => setAgentFilter(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All agents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {tab === "upcoming" ? (
        upcomingCount === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            {GROUP_ORDER.map((groupName) => {
              const groupVisits = upcoming.get(groupName);
              if (!groupVisits?.length) return null;
              const isStale = groupName === "Needs update";
              return (
                <section key={groupName}>
                  <h2
                    className={cn(
                      "mb-2 flex items-center gap-1.5 text-sm font-semibold",
                      isStale ? "text-amber-600" : "text-muted-foreground"
                    )}
                  >
                    {isStale && <AlertTriangle className="size-4" />}
                    {groupName}
                    <span className="font-normal">({groupVisits.length})</span>
                  </h2>
                  <div
                    className={cn(
                      "divide-y divide-border overflow-hidden rounded-xl border bg-card",
                      isStale ? "border-amber-200" : "border-border"
                    )}
                  >
                    {groupVisits.map((visit) => (
                      <VisitRow
                        key={visit.id}
                        visit={visit}
                        showDate={groupName !== "Today" && groupName !== "Tomorrow"}
                        canManage={canManage}
                        onAction={(status) => setPending({ visit, status })}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )
      ) : history.length === 0 ? (
        <EmptyState history />
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {history.map((visit) => (
            <VisitRow key={visit.id} visit={visit} showDate canManage={false} onAction={() => {}} />
          ))}
        </div>
      )}

      {pending && (
        <VisitStatusDialog
          visitId={pending.visit.id}
          status={pending.status}
          open={!!pending}
          onOpenChange={(open) => !open && setPending(null)}
          onDone={() => router.refresh()}
        />
      )}

      {canManage && (
        <ScheduleVisitDialog
          leads={leads}
          agents={agents}
          currentUserId={currentUserId}
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          onScheduled={() => router.refresh()}
        />
      )}
    </div>
  );
}

function VisitRow({
  visit,
  showDate,
  canManage,
  onAction,
}: {
  visit: VisitListItem;
  showDate: boolean;
  canManage: boolean;
  onAction: (status: ResolvableStatus) => void;
}) {
  const when = new Date(visit.scheduledAt);

  return (
    <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
      <div className="w-24 shrink-0">
        <p className="text-sm font-semibold">
          {when.toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}
        </p>
        {showDate && (
          <p className="text-xs text-muted-foreground">
            {when.toLocaleDateString("en-BD", { day: "2-digit", month: "short" })}
          </p>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link href={`/leads/${visit.lead.id}`} className="text-sm font-medium text-primary hover:underline">
          {visit.lead.name}
        </Link>
        <p className="text-xs text-muted-foreground">{displayBDPhone(visit.lead.phone)}</p>
      </div>

      <p className="flex min-w-0 flex-1 items-center gap-1 truncate text-xs text-muted-foreground">
        <MapPin className="size-3 shrink-0" />
        {visit.location}
      </p>

      <p className="flex w-32 shrink-0 items-center gap-1 truncate text-xs text-muted-foreground">
        <UserRound className="size-3 shrink-0" />
        {visit.agent.name}
      </p>

      <Badge variant="outline" className={cn("shrink-0 text-xs", VISIT_STATUS_BADGE[visit.status])}>
        {VISIT_STATUS_LABELS[visit.status]}
      </Badge>

      {canManage && visit.status === "SCHEDULED" && (
        <div className="flex shrink-0 gap-0.5">
          <Button variant="ghost" size="icon-sm" title="Complete" onClick={() => onAction("COMPLETED")}>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Cancel" onClick={() => onAction("CANCELLED")}>
            <XCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="No-show"
            className="text-destructive hover:text-destructive"
            onClick={() => onAction("NO_SHOW")}
          >
            <AlertTriangle className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ history }: { history?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
      <CalendarCheck className="size-12 text-muted-foreground/50" />
      <p className="font-medium">{history ? "No past visits yet" : "No upcoming visits"}</p>
      <p className="text-sm text-muted-foreground">
        Schedule visits from a lead&apos;s detail page.
      </p>
      {!history && (
        <Button variant="outline" className="mt-2" nativeButton={false} render={<Link href="/leads" />}>
          Go to leads
        </Button>
      )}
    </div>
  );
}
