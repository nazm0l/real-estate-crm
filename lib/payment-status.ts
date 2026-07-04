import type { PaymentStatus } from "@prisma/client";

export type EffectivePaymentStatus = "PENDING" | "PAID" | "OVERDUE";

export function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

// The DB never stores OVERDUE — it's derived at read time (no cron needed).
// A payment due today is still Pending; it becomes Overdue the next day.
export function effectivePaymentStatus(payment: {
  status: PaymentStatus;
  dueDate: Date | string;
}): EffectivePaymentStatus {
  if (payment.status === "PAID") return "PAID";
  const due = typeof payment.dueDate === "string" ? new Date(payment.dueDate) : payment.dueDate;
  return due < startOfToday() ? "OVERDUE" : "PENDING";
}
