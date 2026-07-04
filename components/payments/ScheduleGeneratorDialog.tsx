"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { addMonths } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatBDT } from "@/lib/format-bdt";
import { parseBDTInput } from "@/lib/parse-bdt";
import { PAYMENT_TYPE_LABELS } from "./constants";
import type { PaymentType } from "@prisma/client";

type Row = { type: PaymentType; amountText: string; dueDate: Date };

export function ScheduleGeneratorDialog({
  leadId,
  linkedProperties,
  open,
  onOpenChange,
  onDone,
}: {
  leadId: string;
  linkedProperties: { id: string; title: string; price: number }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [totalText, setTotalText] = useState("");
  const [bookingText, setBookingText] = useState("");
  const [downText, setDownText] = useState("");
  const [installmentsText, setInstallmentsText] = useState("12");
  const [firstDate, setFirstDate] = useState<Date>(addMonths(new Date(), 1));
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState(false);

  const total = totalText.trim() ? parseBDTInput(totalText) : null;
  const booking = bookingText.trim() ? parseBDTInput(bookingText) : null;
  const down = downText.trim() ? parseBDTInput(downText) : 0;
  const n = Number(installmentsText);

  function handlePropertySelect(id: string | null) {
    setPropertyId(id);
    const property = linkedProperties.find((p) => p.id === id);
    if (property && !totalText.trim()) setTotalText(String(property.price));
  }

  function generateRows() {
    if (total == null || total <= 0) {
      toast.error("Enter a valid total price, e.g. 30 lakh");
      return;
    }
    if (booking == null || booking <= 0) {
      toast.error("Enter a valid booking money amount");
      return;
    }
    if (!Number.isInteger(n) || n < 1 || n > 60) {
      toast.error("Installments must be between 1 and 60");
      return;
    }
    const remaining = total - booking - (down ?? 0);
    if (remaining <= 0) {
      toast.error("Booking + down payment must be less than the total price");
      return;
    }

    // Whole-taka split: the last installment absorbs the rounding remainder.
    const base = Math.floor(remaining / n);
    const generated: Row[] = [
      { type: "BOOKING_MONEY", amountText: String(booking), dueDate: new Date() },
      ...(down && down > 0
        ? [{ type: "DOWN_PAYMENT" as PaymentType, amountText: String(down), dueDate: new Date() }]
        : []),
      ...Array.from({ length: n }, (_, i) => ({
        type: "INSTALLMENT" as PaymentType,
        amountText: String(i === n - 1 ? remaining - base * (n - 1) : base),
        dueDate: addMonths(firstDate, i),
      })),
    ];
    setRows(generated);
  }

  const rowSum = useMemo(
    () => rows?.reduce((sum, r) => sum + (parseBDTInput(r.amountText) ?? 0), 0) ?? 0,
    [rows]
  );

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev!.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function handleSubmit() {
    if (!rows) return;
    const payments = [];
    for (const [i, row] of rows.entries()) {
      const amount = parseBDTInput(row.amountText);
      if (amount == null || amount <= 0) {
        toast.error(`Row ${i + 1} has an invalid amount`);
        return;
      }
      payments.push({ type: row.type, amount, dueDate: row.dueDate.toISOString() });
    }

    setSaving(true);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, propertyId: propertyId ?? undefined, payments }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(typeof data?.error === "string" ? data.error : "Could not create the schedule");
      return;
    }
    toast.success(`Payment schedule created (${payments.length} payments)`);
    reset();
    onOpenChange(false);
    onDone();
  }

  function reset() {
    setPropertyId(null);
    setTotalText("");
    setBookingText("");
    setDownText("");
    setInstallmentsText("12");
    setFirstDate(addMonths(new Date(), 1));
    setRows(null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create payment schedule</DialogTitle>
        </DialogHeader>

        {!rows ? (
          <div className="space-y-4">
            {linkedProperties.length > 0 && (
              <div className="space-y-2">
                <Label>Property</Label>
                <Select value={propertyId} onValueChange={handlePropertySelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a linked property (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {linkedProperties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title} — {formatBDT(p.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="gen-total">Total price</Label>
                <Input
                  id="gen-total"
                  placeholder="e.g. 30 lakh"
                  value={totalText}
                  onChange={(e) => setTotalText(e.target.value)}
                />
                {total != null && <p className="text-xs text-muted-foreground">{formatBDT(total)}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gen-booking">Booking money</Label>
                <Input
                  id="gen-booking"
                  placeholder="e.g. 2 lakh"
                  value={bookingText}
                  onChange={(e) => setBookingText(e.target.value)}
                />
                {booking != null && <p className="text-xs text-muted-foreground">{formatBDT(booking)}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gen-down">Down payment</Label>
                <Input
                  id="gen-down"
                  placeholder="0 if none"
                  value={downText}
                  onChange={(e) => setDownText(e.target.value)}
                />
                {down != null && down > 0 && (
                  <p className="text-xs text-muted-foreground">{formatBDT(down)}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gen-installments">Monthly installments</Label>
                <Input
                  id="gen-installments"
                  type="number"
                  min={1}
                  max={60}
                  value={installmentsText}
                  onChange={(e) => setInstallmentsText(e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>First installment date</Label>
                <Popover>
                  <PopoverTrigger
                    className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start font-normal")}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {firstDate.toLocaleDateString("en-BD")}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={firstDate} onSelect={(d) => d && setFirstDate(d)} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {PAYMENT_TYPE_LABELS[row.type]}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.amountText}
                          onChange={(e) => updateRow(i, { amountText: e.target.value })}
                          className="h-8 w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" }),
                              "w-36 justify-start font-normal"
                            )}
                          >
                            <CalendarIcon className="h-3.5 w-3.5" />
                            {row.dueDate.toLocaleDateString("en-BD")}
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={row.dueDate}
                              onSelect={(d) => d && updateRow(i, { dueDate: d })}
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {rows.length} payments · total {formatBDT(rowSum)}
              </span>
              {total != null && rowSum !== total && (
                <span className="text-warning-foreground rounded-md bg-warning/10 px-2 py-1 text-xs text-amber-700">
                  Differs from total price ({formatBDT(total)})
                </span>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {rows ? (
            <>
              <Button variant="outline" onClick={() => setRows(null)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Creating…" : `Create ${rows.length} payments`}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={generateRows}>Generate schedule</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
