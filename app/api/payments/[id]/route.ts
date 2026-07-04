import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { formatBDT } from "@/lib/format-bdt";
import { PAYMENT_TYPE_LABELS } from "@/components/payments/constants";
import { parseJsonBody } from "@/lib/parse-body";

const markPaidSchema = z.object({
  paidDate: z.string().datetime(),
  method: z.enum(["cash", "bank", "bkash", "nagad", "cheque"]),
  reference: z.string().max(120).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, session } = await requirePermission(PERMISSIONS.PAYMENTS_MARK_PAID);
  if (error) return error;

  const payment = await prisma.payment.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!payment) return new Response("Not found", { status: 404 });
  if (payment.status === "PAID") {
    return NextResponse.json({ error: "This payment is already marked as paid" }, { status: 409 });
  }

  const { data: body, error: bodyError } = await parseJsonBody(req);

  if (bodyError) return bodyError;
  const parsed = markPaidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { paidDate, method, reference } = parsed.data;

  const [updated] = await prisma.$transaction([
    prisma.payment.update({
      where: { id },
      data: { status: "PAID", paidDate: new Date(paidDate), method, reference },
    }),
    prisma.leadActivity.create({
      data: {
        leadId: payment.leadId,
        createdById: session.user.id,
        type: "payment",
        description: `Payment received ${formatBDT(payment.amount)} via ${method}${reference ? ` (ref: ${reference})` : ""}`,
      },
    }),
  ]);

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, session } = await requirePermission(PERMISSIONS.PAYMENTS_DELETE);
  if (error) return error;

  const payment = await prisma.payment.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!payment) return new Response("Not found", { status: 404 });
  if (payment.status === "PAID") {
    return NextResponse.json(
      { error: "Paid payments are an audit record and cannot be deleted" },
      { status: 409 }
    );
  }

  await prisma.$transaction([
    prisma.payment.delete({ where: { id } }),
    prisma.leadActivity.create({
      data: {
        leadId: payment.leadId,
        createdById: session.user.id,
        type: "payment",
        description: `Payment deleted: ${PAYMENT_TYPE_LABELS[payment.type]} ${formatBDT(payment.amount)} due ${payment.dueDate.toLocaleDateString("en-BD")}`,
      },
    }),
  ]);

  return NextResponse.json({ deleted: true });
}
