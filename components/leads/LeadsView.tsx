"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { PipelineStage } from "@prisma/client";
import { toast } from "sonner";
import { LayoutGrid, List as ListIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadListView } from "./LeadListView";
import { LeadForm } from "./LeadForm";
import type { LeadWithAgent } from "./types";

// @dnd-kit generates its accessibility ids from a module-level counter that isn't
// guaranteed to match between the SSR pass and the client's first render, which
// causes a hydration mismatch. The drag-and-drop board is inherently a client-only
// interaction anyway, so it's loaded client-side only.
const LeadKanban = dynamic(() => import("./LeadKanban").then((mod) => mod.LeadKanban), {
  ssr: false,
  loading: () => (
    <div className="flex h-full gap-3 overflow-x-auto pb-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-full min-w-[260px] flex-1 shrink-0 rounded-xl" />
      ))}
    </div>
  ),
});

type FollowUpFilter = "all" | "overdue" | "today";

export function LeadsView({
  initialLeads,
  agents,
  properties,
  canCreate,
  canEditOwn,
  canEditAny,
  canAssign,
  currentUserId,
}: {
  initialLeads: LeadWithAgent[];
  agents: { id: string; name: string }[];
  properties: { id: string; title: string; locationArea: string }[];
  canCreate: boolean;
  canEditOwn: boolean;
  canEditAny: boolean;
  canAssign: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [followupFilter, setFollowupFilter] = useState<FollowUpFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadWithAgent | null>(null);

  function canEditLead(lead: LeadWithAgent) {
    return canEditAny || (canEditOwn && lead.agentId === currentUserId);
  }

  const filteredLeads = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const digitsOnly = search.replace(/\D/g, "");

    return leads.filter((lead) => {
      if (search) {
        const matchesName = lead.name.toLowerCase().includes(search.toLowerCase());
        const matchesPhone = digitsOnly && lead.phone.includes(digitsOnly);
        if (!matchesName && !matchesPhone) return false;
      }
      if (followupFilter === "overdue") {
        if (!lead.nextFollowUpAt || new Date(lead.nextFollowUpAt) >= now) return false;
      }
      if (followupFilter === "today") {
        if (!lead.nextFollowUpAt || new Date(lead.nextFollowUpAt).toDateString() !== todayStr) return false;
      }
      return true;
    });
  }, [leads, search, followupFilter]);

  function handleLeadChange(updated: LeadWithAgent) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  // API responses don't include the agent relation — resolve it from the
  // already-loaded agents list so the row/card renders complete immediately.
  function withAgent(lead: Omit<LeadWithAgent, "agent">): LeadWithAgent {
    return { ...lead, agent: agents.find((a) => a.id === lead.agentId) ?? null };
  }

  function handleLeadCreated(lead: LeadWithAgent) {
    setLeads((prev) => [withAgent(lead), ...prev]);
    router.refresh();
  }

  function handleLeadEdited(saved: LeadWithAgent) {
    setLeads((prev) => prev.map((l) => (l.id === saved.id ? { ...l, ...withAgent(saved) } : l)));
    router.refresh();
  }

  function handleBulkUpdate(
    ids: string[],
    changes: { agentId?: string; pipelineStage?: PipelineStage }
  ) {
    setLeads((prev) =>
      prev.map((l) =>
        ids.includes(l.id)
          ? {
              ...l,
              ...(changes.agentId !== undefined
                ? {
                    agentId: changes.agentId,
                    agent: agents.find((a) => a.id === changes.agentId) ?? null,
                  }
                : {}),
              ...(changes.pipelineStage !== undefined
                ? { pipelineStage: changes.pipelineStage }
                : {}),
            }
          : l
      )
    );
    router.refresh();
  }

  async function changeLeadStage(lead: LeadWithAgent, newStage: PipelineStage) {
    if (lead.pipelineStage === newStage || !canEditLead(lead)) return;

    const previousStage = lead.pipelineStage;
    handleLeadChange({ ...lead, pipelineStage: newStage });

    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStage: newStage }),
    });

    if (!res.ok) {
      handleLeadChange({ ...lead, pipelineStage: previousStage });
      toast.error("Could not move this lead. Please try again.");
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {filteredLeads.length} of {leads.length} leads
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Add lead
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={followupFilter}
          onValueChange={(v) => v && setFollowupFilter(v as FollowUpFilter)}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="today">Due today</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search name or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
          <div className="flex rounded-md border border-border p-0.5">
            <Button
              variant={view === "kanban" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setView("kanban")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setView("list")}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {view === "kanban" ? (
          <LeadKanban leads={filteredLeads} canEditLead={canEditLead} onStageChange={changeLeadStage} />
        ) : (
          <div className="h-full overflow-y-auto">
            <LeadListView
              leads={filteredLeads}
              canEditLead={canEditLead}
              onEdit={setEditingLead}
              onStageChange={changeLeadStage}
              agents={agents}
              canAssign={canAssign}
              canBulkStage={canEditAny}
              onBulkUpdate={handleBulkUpdate}
            />
          </div>
        )}
      </div>

      {canCreate && (
        <LeadForm
          mode="create"
          open={formOpen}
          onOpenChange={setFormOpen}
          agents={agents}
          properties={properties}
          canAssign={canAssign}
          currentUserId={currentUserId}
          onSaved={handleLeadCreated}
        />
      )}

      {editingLead && (
        <LeadForm
          mode="edit"
          lead={editingLead}
          open={!!editingLead}
          onOpenChange={(open) => !open && setEditingLead(null)}
          agents={agents}
          canAssign={canAssign}
          currentUserId={currentUserId}
          onSaved={handleLeadEdited}
        />
      )}
    </div>
  );
}
