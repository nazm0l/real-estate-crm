"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { PipelineStage } from "@prisma/client";
import { KanbanColumn } from "./KanbanColumn";
import { LeadCardBody } from "./LeadCard";
import { PIPELINE_STAGES } from "./constants";
import type { LeadWithAgent } from "./types";

export function LeadKanban({
  leads,
  canEditLead,
  onStageChange,
}: {
  leads: LeadWithAgent[];
  canEditLead: (lead: LeadWithAgent) => boolean;
  onStageChange: (lead: LeadWithAgent, newStage: PipelineStage) => Promise<void>;
}) {
  // Touch uses long-press so horizontal swipe scrolls the board instead of dragging cards
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );
  const [activeLead, setActiveLead] = useState<LeadWithAgent | null>(null);

  function handleDragStart(event: DragStartEvent) {
    const lead = leads.find((l) => l.id === String(event.active.id));
    setActiveLead(lead ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const lead = leads.find((l) => l.id === String(active.id));
    if (!lead) return;
    await onStageChange(lead, over.id as PipelineStage);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveLead(null)}
    >
      <div className="flex h-full gap-3 overflow-x-auto pb-2 snap-x snap-mandatory md:snap-none">
        {PIPELINE_STAGES.map((stage) => (
          <KanbanColumn
            key={stage.value}
            stage={stage.value}
            label={stage.label}
            leads={leads.filter((l) => l.pipelineStage === stage.value)}
            canEditLead={canEditLead}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead && <LeadCardBody lead={activeLead} className="cursor-grabbing shadow-xl ring-2 ring-primary/30" />}
      </DragOverlay>
    </DndContext>
  );
}
