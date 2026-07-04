import type { PaymentType } from "@prisma/client";
import type { EffectivePaymentStatus } from "@/lib/payment-status";

export const PAYMENT_BADGE: Record<EffectivePaymentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  PAID: "bg-teal-50 text-teal-700 border-teal-200",
  OVERDUE: "bg-red-50 text-red-600 border-red-200",
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  BOOKING_MONEY: "Booking money",
  DOWN_PAYMENT: "Down payment",
  INSTALLMENT: "Installment",
  FINAL_PAYMENT: "Final payment",
  OTHER: "Other",
};

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "cheque", label: "Cheque" },
] as const;
