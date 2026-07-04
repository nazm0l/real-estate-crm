"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function ScheduleVisitDialog({
  leadId,
  leads,
  defaultLocation,
  agents,
  currentUserId,
  open,
  onOpenChange,
  onScheduled,
}: {
  leadId?: string;
  // When no leadId is fixed, pass leads to let the user pick one (visits page mode)
  leads?: { id: string; name: string; locationArea: string | null }[];
  defaultLocation?: string | null;
  agents: { id: string; name: string }[];
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduled: () => void;
}) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leadId ?? null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("10:00");
  const [location, setLocation] = useState(defaultLocation ?? "");
  const [note, setNote] = useState("");
  const [agentId, setAgentId] = useState<string | null>(currentUserId);
  const [saving, setSaving] = useState(false);

  function reset() {
    setSelectedLeadId(leadId ?? null);
    setDate(undefined);
    setTime("10:00");
    setLocation(defaultLocation ?? "");
    setNote("");
    setAgentId(currentUserId);
  }

  function handleLeadPick(id: string | null) {
    setSelectedLeadId(id);
    const lead = leads?.find((l) => l.id === id);
    if (lead?.locationArea && !location.trim()) setLocation(lead.locationArea);
  }

  async function handleSubmit() {
    if (!selectedLeadId) {
      toast.error("Pick a lead for the visit");
      return;
    }
    if (!date) {
      toast.error("Pick a date for the visit");
      return;
    }
    const [hours, minutes] = time.split(":").map(Number);
    const scheduledAt = new Date(date);
    scheduledAt.setHours(hours || 0, minutes || 0, 0, 0);

    setSaving(true);
    const res = await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: selectedLeadId,
        scheduledAt: scheduledAt.toISOString(),
        location,
        note: note || undefined,
        agentId: agentId ?? undefined,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      toast.error("Could not schedule the visit");
      return;
    }

    toast.success("Site visit scheduled");
    reset();
    onOpenChange(false);
    onScheduled();
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
          <DialogTitle>Schedule site visit</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!leadId && leads && (
            <div className="space-y-2">
              <Label>Lead</Label>
              <Select value={selectedLeadId} onValueChange={handleLeadPick}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name}
                      {lead.locationArea ? ` · ${lead.locationArea}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger
                  className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start font-normal")}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {date ? date.toLocaleDateString("en-BD") : "Pick a date"}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="visit-time">Time</Label>
              <Input id="visit-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="visit-location">Location</Label>
              <Input id="visit-location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Assigned agent</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                      {agent.id === currentUserId ? " (me)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit-note">Note</Label>
            <Textarea id="visit-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !selectedLeadId || !date || !location.trim()}>
            {saving ? "Scheduling…" : "Schedule visit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
