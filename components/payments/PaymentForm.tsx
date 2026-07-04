"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { formatBDT } from "@/lib/format-bdt";
import { parseBDTInput } from "@/lib/parse-bdt";
import { PAYMENT_TYPE_LABELS } from "./constants";
import type { PaymentType } from "@prisma/client";

const TYPES = Object.keys(PAYMENT_TYPE_LABELS) as PaymentType[];

export function PaymentForm({
  leadId,
  open,
  onOpenChange,
  onDone,
}: {
  leadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [type, setType] = useState<PaymentType>("OTHER");
  const [amountText, setAmountText] = useState("");
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const amount = amountText.trim() ? parseBDTInput(amountText) : null;

  async function handleSubmit() {
    if (amount == null || amount <= 0) {
      toast.error("Enter a valid amount, e.g. 50,000");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        payments: [
          { type, amount, dueDate: dueDate.toISOString(), note: note.trim() || undefined },
        ],
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(typeof data?.error === "string" ? data.error : "Could not add this payment");
      return;
    }
    toast.success("Payment added");
    setAmountText("");
    setNote("");
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => v && setType(v as PaymentType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {PAYMENT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Amount</Label>
              <Input
                id="payment-amount"
                placeholder="e.g. 50,000"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
              />
              {amount != null && <p className="text-xs text-muted-foreground">{formatBDT(amount)}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due date</Label>
            <Popover>
              <PopoverTrigger
                className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start font-normal")}
              >
                <CalendarIcon className="h-4 w-4" />
                {dueDate.toLocaleDateString("en-BD")}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dueDate} onSelect={(d) => d && setDueDate(d)} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-note">Note</Label>
            <Input
              id="payment-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !amountText.trim()}>
            {saving ? "Adding…" : "Add payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
