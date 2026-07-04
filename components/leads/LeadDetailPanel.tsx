"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { displayBDPhone } from "@/lib/bd-phone";
import { formatBDT } from "@/lib/format-bdt";
import { SOURCE_BADGE, SCORE_BADGE, STAGE_BADGE } from "./constants";
import { LeadForm } from "./LeadForm";
import type { LeadDetail } from "./types";

export function LeadDetailPanel({
  lead,
  agents,
  canEdit,
  canAssign,
  currentUserId,
}: {
  lead: LeadDetail;
  agents: { id: string; name: string }[];
  canEdit: boolean;
  canAssign: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const budgetParts = [lead.budgetMin, lead.budgetMax].filter((v): v is number => v != null);
  const budgetLabel = budgetParts.length ? budgetParts.map((v) => formatBDT(v)).join(" – ") : "Not set";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Lead details</CardTitle>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Phone" value={displayBDPhone(lead.phone)} />
        <Field label="Email" value={lead.email ?? "Not set"} />
        <Field label="Location" value={lead.locationArea ?? "Not set"} />
        <Field label="Budget" value={budgetLabel} />
        <Field label="Property type" value={lead.propertyType ?? "Any"} />
        <Field label="Agent" value={lead.agent?.name ?? "Unassigned"} />
        <div>
          <p className="text-xs text-muted-foreground">Stage</p>
          <Badge variant="outline" className={cn("mt-1 text-xs", STAGE_BADGE[lead.pipelineStage])}>
            {lead.pipelineStage}
          </Badge>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Source</p>
          <div className="mt-1 flex gap-1">
            <Badge variant="outline" className={cn("text-xs", SOURCE_BADGE[lead.source])}>
              {lead.source}
            </Badge>
            {lead.aiScore && (
              <Badge variant="outline" className={cn("text-xs", SCORE_BADGE[lead.aiScore])}>
                {lead.aiScore}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>

      {canEdit && (
        <LeadForm
          mode="edit"
          lead={lead}
          open={editOpen}
          onOpenChange={setEditOpen}
          agents={agents}
          canAssign={canAssign}
          currentUserId={currentUserId}
          onSaved={() => router.refresh()}
        />
      )}
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
