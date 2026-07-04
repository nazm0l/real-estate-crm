"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, CheckCircle2, Plus, Trash2, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatBDT } from "@/lib/format-bdt";
import { effectivePaymentStatus } from "@/lib/payment-status";
import { PAYMENT_BADGE, PAYMENT_TYPE_LABELS } from "./constants";
import { MarkPaidDialog } from "./MarkPaidDialog";
import { PaymentForm } from "./PaymentForm";
import { ScheduleGeneratorDialog } from "./ScheduleGeneratorDialog";
import type { PaymentItem } from "./types";
import type { PipelineStage } from "@prisma/client";

export function PaymentSchedule({
  leadId,
  pipelineStage,
  payments,
  linkedProperties,
  canCreate,
  canMarkPaid,
  canDelete,
}: {
  leadId: string;
  pipelineStage: PipelineStage;
  payments: PaymentItem[];
  linkedProperties: { id: string; title: string; price: number }[];
  canCreate: boolean;
  canMarkPaid: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<PaymentItem | null>(null);
  const [deleting, setDeleting] = useState<PaymentItem | null>(null);
  const [busy, setBusy] = useState(false);

  const collected = payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);
  const outstanding = payments
    .filter((p) => p.status !== "PAID")
    .reduce((sum, p) => sum + p.amount, 0);

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await fetch(`/api/payments/${deleting.id}`, { method: "DELETE" });
    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(typeof data?.error === "string" ? data.error : "Could not delete this payment");
      return;
    }
    toast.success("Payment deleted");
    setDeleting(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-7 items-center justify-center rounded-md bg-accent text-primary">
            <Wallet className="size-4" />
          </span>
          Payment schedule
        </CardTitle>
        {canCreate && (
          <div className="flex gap-2">
            {pipelineStage === "BOOKED" && (
              <Button variant="outline" size="sm" onClick={() => setGeneratorOpen(true)}>
                <CalendarPlus className="h-4 w-4" />
                Create payment schedule
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add payment
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No payments yet.
            {pipelineStage !== "BOOKED" && " Move this lead to Booked to create a schedule."}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => {
                    const status = effectivePaymentStatus(payment);
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {PAYMENT_TYPE_LABELS[payment.type]}
                        </TableCell>
                        <TableCell className="font-medium">{formatBDT(payment.amount)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(payment.dueDate).toLocaleDateString("en-BD", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs", PAYMENT_BADGE[status])}>
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {payment.paidDate
                            ? `${new Date(payment.paidDate).toLocaleDateString("en-BD", { day: "2-digit", month: "short" })}${payment.method ? ` · ${payment.method}` : ""}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-0.5">
                            {status !== "PAID" && canMarkPaid && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Mark as paid"
                                onClick={() => setMarkingPaid(payment)}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            {status !== "PAID" && canDelete && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Delete"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleting(payment)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap justify-end gap-4 text-sm">
              <span>
                Collected: <span className="font-semibold text-primary">{formatBDT(collected)}</span>
              </span>
              <span>
                Outstanding: <span className="font-semibold">{formatBDT(outstanding)}</span>
              </span>
            </div>
          </div>
        )}
      </CardContent>

      {canCreate && (
        <>
          <ScheduleGeneratorDialog
            leadId={leadId}
            linkedProperties={linkedProperties}
            open={generatorOpen}
            onOpenChange={setGeneratorOpen}
            onDone={() => router.refresh()}
          />
          <PaymentForm
            leadId={leadId}
            open={addOpen}
            onOpenChange={setAddOpen}
            onDone={() => router.refresh()}
          />
        </>
      )}

      {markingPaid && (
        <MarkPaidDialog
          payment={markingPaid}
          open={!!markingPaid}
          onOpenChange={(open) => !open && setMarkingPaid(null)}
          onDone={() => router.refresh()}
        />
      )}

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this payment?</DialogTitle>
          </DialogHeader>
          {deleting && (
            <p className="text-sm text-muted-foreground">
              {PAYMENT_TYPE_LABELS[deleting.type]} of {formatBDT(deleting.amount)} due{" "}
              {new Date(deleting.dueDate).toLocaleDateString("en-BD")} will be removed.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy ? "Deleting…" : "Delete payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
