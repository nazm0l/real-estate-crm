"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export function LogActivityDialog({
  leadId,
  type,
  open,
  onOpenChange,
  onLogged,
}: {
  leadId: string;
  type: "call" | "note";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogged: () => void;
}) {
  const [description, setDescription] = useState("");
  const [setFollowUp, setSetFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  function reset() {
    setDescription("");
    setSetFollowUp(false);
    setFollowUpDate(undefined);
  }

  async function handleSubmit() {
    setSaving(true);
    const res = await fetch(`/api/leads/${leadId}/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        description,
        ...(setFollowUp ? { nextFollowUpAt: followUpDate ? followUpDate.toISOString() : null } : {}),
      }),
    });
    setSaving(false);

    if (!res.ok) {
      toast.error(type === "call" ? "Could not log the call" : "Could not save the note");
      return;
    }

    toast.success(type === "call" ? "Call logged" : "Note added");
    reset();
    onOpenChange(false);
    onLogged();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{type === "call" ? "Log a call" : "Add a note"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activity-description" required>
              {type === "call" ? "What was discussed?" : "Note"}
            </Label>
            <Textarea
              id="activity-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="set-followup">Set next follow-up date</Label>
            <Switch id="set-followup" checked={setFollowUp} onCheckedChange={setSetFollowUp} />
          </div>

          {setFollowUp && (
            <Popover>
              <PopoverTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start font-normal")}>
                <CalendarIcon className="h-4 w-4" />
                {followUpDate ? followUpDate.toLocaleDateString("en-BD") : "Pick a date"}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={followUpDate} onSelect={setFollowUpDate} />
              </PopoverContent>
            </Popover>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !description.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
