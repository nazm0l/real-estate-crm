import type { PaymentType, PaymentStatus } from "@prisma/client";

export type PaymentItem = {
  id: string;
  type: PaymentType;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: PaymentStatus;
  method: string | null;
  reference: string | null;
  note: string | null;
};
