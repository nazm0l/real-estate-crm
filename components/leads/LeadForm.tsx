"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { normalizeBDPhone, displayBDPhone } from "@/lib/bd-phone";
import { formatBDT } from "@/lib/format-bdt";
import { parseBDTInput } from "@/lib/parse-bdt";
import { LocationPicker } from "./LocationPicker";
import type { LeadWithAgent } from "./types";

const SOURCES = ["MANUAL", "WEBSITE", "FACEBOOK", "INSTAGRAM", "REFERRAL"] as const;
const PROPERTY_TYPES = ["APARTMENT", "LAND", "COMMERCIAL"] as const;

type DuplicateInfo = { id: string; name: string } | null;

export function LeadForm({
  mode,
  lead,
  open,
  onOpenChange,
  agents,
  canAssign,
  currentUserId,
  onSaved,
}: {
  mode: "create" | "edit";
  lead?: LeadWithAgent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: { id: string; name: string }[];
  canAssign: boolean;
  currentUserId: string;
  onSaved: (lead: LeadWithAgent) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<(typeof SOURCES)[number]>("MANUAL");
  const [propertyType, setPropertyType] = useState<(typeof PROPERTY_TYPES)[number] | null>(null);
  const [budgetMinText, setBudgetMinText] = useState("");
  const [budgetMaxText, setBudgetMaxText] = useState("");
  const [locationArea, setLocationArea] = useState<string | null>(null);
  const [nextFollowUpAt, setNextFollowUpAt] = useState<Date | undefined>(undefined);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateInfo>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(lead?.name ?? "");
    setPhone(lead ? displayBDPhone(lead.phone) : "");
    setEmail(lead?.email ?? "");
    setSource((lead?.source as (typeof SOURCES)[number]) ?? "MANUAL");
    setPropertyType((lead?.propertyType as (typeof PROPERTY_TYPES)[number]) ?? null);
    setBudgetMinText(lead?.budgetMin ? String(lead.budgetMin) : "");
    setBudgetMaxText(lead?.budgetMax ? String(lead.budgetMax) : "");
    setLocationArea(lead?.locationArea ?? null);
    setNextFollowUpAt(lead?.nextFollowUpAt ? new Date(lead.nextFollowUpAt) : undefined);
    setAgentId(lead?.agentId ?? (mode === "create" ? currentUserId : null));
    setPhoneError(null);
    setDuplicate(null);
  }, [open, lead, mode, currentUserId]);

  async function handlePhoneBlur() {
    setPhoneError(null);
    setDuplicate(null);
    if (!phone.trim()) return;

    const normalized = normalizeBDPhone(phone);
    if (!normalized) {
      setPhoneError("Enter a valid Bangladeshi mobile number");
      return;
    }

    const params = new URLSearchParams({ phone: normalized });
    if (mode === "edit" && lead) params.set("excludeId", lead.id);
    const res = await fetch(`/api/leads/check-duplicate?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.duplicate) setDuplicate(data.lead);
  }

  async function handleSubmit() {
    const normalizedPhone = normalizeBDPhone(phone);
    if (!normalizedPhone) {
      setPhoneError("Enter a valid Bangladeshi mobile number");
      return;
    }

    const budgetMin = budgetMinText.trim() ? parseBDTInput(budgetMinText) : null;
    const budgetMax = budgetMaxText.trim() ? parseBDTInput(budgetMaxText) : null;
    if (budgetMinText.trim() && budgetMin == null) {
      toast.error("Enter a valid minimum budget, e.g. 25 lakh");
      return;
    }
    if (budgetMaxText.trim() && budgetMax == null) {
      toast.error("Enter a valid maximum budget, e.g. 1.2 crore");
      return;
    }

    setSaving(true);
    const payload = {
      name,
      phone: normalizedPhone,
      email: email || undefined,
      source,
      propertyType: propertyType ?? undefined,
      budgetMin: budgetMin ?? undefined,
      budgetMax: budgetMax ?? undefined,
      locationArea: locationArea ?? undefined,
      nextFollowUpAt: nextFollowUpAt ? nextFollowUpAt.toISOString() : mode === "edit" ? null : undefined,
      ...(canAssign ? { agentId: agentId ?? undefined } : {}),
    };

    const res = await fetch(mode === "create" ? "/api/leads" : `/api/leads/${lead!.id}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.existingLeadId) {
        setDuplicate({ id: data.existingLeadId, name: "" });
      }
      toast.error(typeof data?.error === "string" ? data.error : "Could not save this lead");
      return;
    }

    const saved = await res.json();
    toast.success(mode === "create" ? "Lead created" : "Lead updated");
    onSaved(saved);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-y-auto data-[side=right]:sm:w-[40vw] data-[side=right]:sm:max-w-[40vw]"
      >
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "Add lead" : "Edit lead"}</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-1 gap-x-4 gap-y-5 px-4 pb-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lead-name">Name</Label>
            <Input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-phone">Phone</Label>
            <Input
              id="lead-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={handlePhoneBlur}
              placeholder="01712-345678"
            />
            {phoneError && <p className="text-sm text-destructive">{phoneError}</p>}
          </div>

          {duplicate && (
            <div className="rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning-foreground sm:col-span-2">
              A lead with this phone number already exists.{" "}
              <Link href={`/leads/${duplicate.id}`} className="font-medium underline">
                View existing lead
              </Link>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="lead-email">Email</Label>
            <Input id="lead-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Source</Label>
            <Select value={source} onValueChange={(v) => v && setSource(v as (typeof SOURCES)[number])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Property type</Label>
            <Select
              value={propertyType}
              onValueChange={(v) => setPropertyType(v as (typeof PROPERTY_TYPES)[number] | null)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget-min">Budget min</Label>
            <Input
              id="budget-min"
              placeholder="e.g. 25 lakh"
              value={budgetMinText}
              onChange={(e) => setBudgetMinText(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-max">Budget max</Label>
            <Input
              id="budget-max"
              placeholder="e.g. 1.2 crore"
              value={budgetMaxText}
              onChange={(e) => setBudgetMaxText(e.target.value)}
            />
          </div>

          {(() => {
            const min = budgetMinText.trim() ? parseBDTInput(budgetMinText) : null;
            const max = budgetMaxText.trim() ? parseBDTInput(budgetMaxText) : null;
            if (min == null && max == null) return null;
            return (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Budget: {[min, max].filter((v): v is number => v != null).map((v) => formatBDT(v)).join(" – ")}
              </p>
            );
          })()}

          <div className="sm:col-span-2">
            <LocationPicker value={locationArea} onChange={setLocationArea} />
          </div>

          <div className="space-y-2">
            <Label>Next follow-up</Label>
            <Popover>
              <PopoverTrigger
                className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start font-normal")}
              >
                <CalendarIcon className="h-4 w-4" />
                {nextFollowUpAt ? nextFollowUpAt.toLocaleDateString("en-BD") : "No date set"}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={nextFollowUpAt} onSelect={setNextFollowUpAt} />
              </PopoverContent>
            </Popover>
          </div>

          {canAssign && (
            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select value={agentId} onValueChange={(v) => setAgentId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <SheetFooter className="sticky bottom-0 flex-row justify-end border-t border-border bg-popover">
          <Button variant="outline" className="min-w-32" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="min-w-32"
            onClick={handleSubmit}
            disabled={saving || !name.trim() || !phone.trim()}
          >
            {saving ? "Saving…" : mode === "create" ? "Add lead" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
