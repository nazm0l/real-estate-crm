"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export function FollowUpBar({
  leadId,
  nextFollowUpAt: initialNextFollowUpAt,
  canEdit,
}: {
  leadId: string;
  nextFollowUpAt: string | null;
  canEdit: boolean;
}) {
  const [nextFollowUpAt, setNextFollowUpAt] = useState(initialNextFollowUpAt);
  const [saving, setSaving] = useState(false);
  const isOverdue = !!nextFollowUpAt && new Date(nextFollowUpAt).getTime() < Date.now();

  async function handleSelect(date: Date | undefined) {
    setSaving(true);
    const iso = date ? date.toISOString() : null;
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nextFollowUpAt: iso }),
    });
    setSaving(false);

    if (!res.ok) {
      toast.error("Could not update the follow-up date");
      return;
    }
    setNextFollowUpAt(iso);
    toast.success("Follow-up date updated");
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border p-4",
        isOverdue ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
      )}
    >
      <div className="flex items-center gap-3">
        <CalendarClock className={cn("h-5 w-5", isOverdue ? "text-destructive" : "text-primary")} />
        <div>
          <p className="text-xs text-muted-foreground">Next follow-up</p>
          <p className={cn("text-sm font-medium", isOverdue && "text-destructive")}>
            {nextFollowUpAt
              ? new Date(nextFollowUpAt).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })
              : "Not set"}
            {isOverdue && " — overdue"}
          </p>
        </div>
      </div>
      {canEdit && (
        <Popover>
          <PopoverTrigger
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            disabled={saving}
          >
            {nextFollowUpAt ? "Change" : "Set date"}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={nextFollowUpAt ? new Date(nextFollowUpAt) : undefined}
              onSelect={handleSelect}
            />
            {nextFollowUpAt && (
              <div className="border-t border-border p-2">
                <Button variant="ghost" size="sm" className="w-full" onClick={() => handleSelect(undefined)}>
                  Clear
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
