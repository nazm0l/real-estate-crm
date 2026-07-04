"use client";

import { useDroppable } from "@dnd-kit/core";
import type { PipelineStage } from "@prisma/client";
import { cn } from "@/lib/utils";
import { LeadCard } from "./LeadCard";
import { STAGE_COLUMN_STYLE } from "./constants";
import type { LeadWithAgent } from "./types";

export function KanbanColumn({
  stage,
  label,
  leads,
  canEditLead,
}: {
  stage: PipelineStage;
  label: string;
  leads: LeadWithAgent[];
  canEditLead: (lead: LeadWithAgent) => boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const style = STAGE_COLUMN_STYLE[stage];
  const Icon = style.icon;

  return (
    <div className="flex h-full min-w-[260px] flex-1 shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className={cn("flex items-center justify-between gap-2 border-t-4 px-2.5 py-2", style.header)}>
        <span className="flex min-w-0 items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5 shrink-0", style.iconColor)} />
          <span className="truncate text-[13px] font-semibold">{label}</span>
        </span>
        <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium", style.count)}>
          {leads.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-1.5 overflow-y-auto p-1.5 transition-colors",
          isOver && "bg-accent/50"
        )}
      >
        {leads.length === 0 && (
          <p className="p-4 text-center text-xs text-muted-foreground">No leads</p>
        )}
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} draggable={canEditLead(lead)} />
        ))}
      </div>
    </div>
  );
}
