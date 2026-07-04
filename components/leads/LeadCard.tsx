"use client";

import { useDraggable } from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { Phone, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { displayBDPhone } from "@/lib/bd-phone";
import { formatBDT } from "@/lib/format-bdt";
import { SCORE_BADGE, SOURCE_BADGE, STAGE_COLUMN_STYLE } from "./constants";
import { FollowUpBadge } from "./FollowUpBadge";
import type { LeadWithAgent } from "./types";

function propertyTypeLabel(type: string) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

export function LeadCardBody({ lead, className }: { lead: LeadWithAgent; className?: string }) {
  const accent = STAGE_COLUMN_STYLE[lead.pipelineStage].accent;
  const budgetParts = [lead.budgetMin, lead.budgetMax].filter((v): v is number => v != null);
  const budgetLabel = budgetParts.length ? budgetParts.map((v) => formatBDT(v)).join(" – ") : null;

  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border border-l-4 border-border bg-card p-2.5 shadow-sm",
        accent,
        className
      )}
    >
      <div className="flex items-center justify-between gap-1.5">
        <p className="truncate text-[13px] font-semibold leading-tight">{lead.name}</p>
        <div className="flex shrink-0 items-center gap-1">
          <FollowUpBadge nextFollowUpAt={lead.nextFollowUpAt} />
          {lead.aiScore && (
            <Badge
              variant="outline"
              className={cn("h-4 px-1 py-0 text-[9px] font-semibold", SCORE_BADGE[lead.aiScore])}
            >
              {lead.aiScore}
            </Badge>
          )}
        </div>
      </div>
      <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
        <span className="flex shrink-0 items-center gap-0.5">
          <Phone className="h-2.5 w-2.5 shrink-0" />
          {displayBDPhone(lead.phone)}
        </span>
        {lead.locationArea && (
          <span className="flex min-w-0 items-center gap-0.5 truncate">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{lead.locationArea}</span>
          </span>
        )}
      </div>
      {(budgetLabel || lead.propertyType) && (
        <p className="mt-0.5 truncate text-[11px] font-medium text-primary">
          {budgetLabel}
          {budgetLabel && lead.propertyType && " · "}
          {lead.propertyType && (
            <span className="text-muted-foreground">{propertyTypeLabel(lead.propertyType)}</span>
          )}
        </p>
      )}
      <div className="mt-1.5 flex items-center justify-between gap-1.5">
        <Badge
          variant="outline"
          className={cn("h-4 px-1 py-0 text-[9px] font-medium", SOURCE_BADGE[lead.source])}
        >
          {lead.source}
        </Badge>
        {lead.agent && (
          <span className="truncate text-[10px] text-muted-foreground">{lead.agent.name}</span>
        )}
      </div>
    </div>
  );
}

export function LeadCard({ lead, draggable }: { lead: LeadWithAgent; draggable: boolean }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    disabled: !draggable,
  });

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      onClick={() => router.push(`/leads/${lead.id}`)}
      className="touch-none"
    >
      <LeadCardBody
        lead={lead}
        className={cn(
          "cursor-pointer transition-shadow hover:shadow-md",
          isDragging && "opacity-30"
        )}
      />
    </div>
  );
}
