"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import type { SiteVisitStatus } from "@prisma/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const TITLES: Record<string, string> = {
  COMPLETED: "Complete this visit",
  CANCELLED: "Cancel this visit",
  NO_SHOW: "Mark as no-show",
};

export function VisitStatusDialog({
  visitId,
  status,
  open,
  onOpenChange,
  onDone,
}: {
  visitId: string;
  status: Extract<SiteVisitStatus, "COMPLETED" | "CANCELLED" | "NO_SHOW">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  function reset() {
    setNote("");
    setFollowUpDate(undefined);
  }

  async function handleSubmit() {
    setSaving(true);
    const res = await fetch(`/api/visits/${visitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        note: note.trim() || undefined,
        ...(status === "COMPLETED" && followUpDate
          ? { nextFollowUpAt: followUpDate.toISOString() }
          : {}),
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(typeof data?.error === "string" ? data.error : "Could not update this visit");
      return;
    }
    toast.success("Visit updated");
    reset();
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{TITLES[status]}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="visit-status-note">
              {status === "COMPLETED" ? "How did it go?" : "Reason"}
            </Label>
            <Textarea
              id="visit-status-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {status === "COMPLETED" && (
            <div className="space-y-2">
              <Label>Next follow-up</Label>
              <Popover>
                <PopoverTrigger
                  className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start font-normal")}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {followUpDate ? followUpDate.toLocaleDateString("en-BD") : "No date (optional)"}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={followUpDate} onSelect={setFollowUpDate} />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="min-w-32" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="min-w-32"
            variant={status === "COMPLETED" ? "default" : "destructive"}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Saving…" : TITLES[status]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
