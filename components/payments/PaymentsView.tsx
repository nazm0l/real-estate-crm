"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Search, Trash2, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatBDT } from "@/lib/format-bdt";
import { effectivePaymentStatus } from "@/lib/payment-status";
import { PAYMENT_BADGE, PAYMENT_TYPE_LABELS } from "./constants";
import { MarkPaidDialog } from "./MarkPaidDialog";
import type { PaymentItem } from "./types";

export type TenantPayment = PaymentItem & {
  lead: { id: string; name: string };
  property: { id: string; title: string } | null;
};

type Tab = "overdue" | "due_this_month" | "paid";

export function PaymentsView({
  initialPayments,
  canMarkPaid,
  canDelete,
}: {
  initialPayments: TenantPayment[];
  canMarkPaid: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overdue");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(25);
  const [markingPaid, setMarkingPaid] = useState<TenantPayment | null>(null);
  const [deleting, setDeleting] = useState<TenantPayment | null>(null);
  const [busy, setBusy] = useState(false);

  const buckets = useMemo(() => {
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const q = search.trim().toLowerCase();

    const matches = (p: TenantPayment) =>
      !q ||
      p.lead.name.toLowerCase().includes(q) ||
      (p.property?.title.toLowerCase().includes(q) ?? false) ||
      (p.reference?.toLowerCase().includes(q) ?? false);

    const overdue: TenantPayment[] = [];
    const dueThisMonth: TenantPayment[] = [];
    const paid: TenantPayment[] = [];

    for (const payment of initialPayments) {
      if (!matches(payment)) continue;
      const status = effectivePaymentStatus(payment);
      if (status === "PAID") paid.push(payment);
      else if (status === "OVERDUE") overdue.push(payment);
      else if (new Date(payment.dueDate) <= monthEnd) dueThisMonth.push(payment);
    }
    paid.sort((a, b) => (b.paidDate ?? "").localeCompare(a.paidDate ?? ""));
    return { overdue, due_this_month: dueThisMonth, paid };
  }, [initialPayments, search]);

  const allRows = buckets[tab];
  const rows = allRows.slice(0, visibleCount);
  const totalOf = (list: TenantPayment[]) => list.reduce((sum, p) => sum + p.amount, 0);

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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Booking money and installments across all leads.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            if (!v) return;
            setTab(v as Tab);
            setVisibleCount(25);
          }}
        >
          <TabsList>
            <TabsTrigger value="overdue">
              Overdue ({buckets.overdue.length} · {formatBDT(totalOf(buckets.overdue))})
            </TabsTrigger>
            <TabsTrigger value="due_this_month">
              Due this month ({buckets.due_this_month.length} ·{" "}
              {formatBDT(totalOf(buckets.due_this_month))})
            </TabsTrigger>
            <TabsTrigger value="paid">
              Paid ({buckets.paid.length} · {formatBDT(totalOf(buckets.paid))})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search lead, property, reference"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(25);
            }}
            className="w-64 pl-8"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <Wallet className="size-12 text-muted-foreground/50" />
          <p className="font-medium">
            {tab === "overdue"
              ? "No overdue payments"
              : tab === "due_this_month"
                ? "Nothing due this month"
                : "No paid payments yet"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((payment) => {
                const status = effectivePaymentStatus(payment);
                return (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <Link
                        href={`/leads/${payment.lead.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {payment.lead.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payment.property ? (
                        <Link href={`/properties/${payment.property.id}`} className="hover:underline">
                          {payment.property.title}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
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
          {allRows.length > visibleCount && (
            <div className="flex justify-center border-t border-border p-3">
              <Button variant="outline" size="sm" onClick={() => setVisibleCount((c) => c + 25)}>
                Show more ({allRows.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
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
              {PAYMENT_TYPE_LABELS[deleting.type]} of {formatBDT(deleting.amount)} for{" "}
              {deleting.lead.name} will be removed.
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
    </div>
  );
}
