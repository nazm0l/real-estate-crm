import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { formatBDT } from "@/lib/format-bdt";
import { parseJsonBody } from "@/lib/parse-body";

const paymentRow = z.object({
  type: z.enum(["BOOKING_MONEY", "DOWN_PAYMENT", "INSTALLMENT", "FINAL_PAYMENT", "OTHER"]),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
  note: z.string().max(500).optional(),
});

const createPaymentsSchema = z.object({
  leadId: z.string().min(1),
  propertyId: z.string().min(1).optional(),
  payments: z.array(paymentRow).min(1).max(64),
});

export async function POST(req: Request) {
  const { error, session } = await requirePermission(PERMISSIONS.PAYMENTS_CREATE);
  if (error) return error;

  const { data: body, error: bodyError } = await parseJsonBody(req);

  if (bodyError) return bodyError;
  const parsed = createPaymentsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { leadId, propertyId, payments } = parsed.data;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId: session.user.tenantId },
  });
  if (!lead) return new Response("Not found", { status: 404 });

  let property = null;
  if (propertyId) {
    property = await prisma.property.findFirst({
      where: { id: propertyId, tenantId: session.user.tenantId },
    });
    if (!property) return new Response("Not found", { status: 404 });
  }

  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  const description =
    payments.length === 1
      ? `Payment added: ${formatBDT(payments[0].amount)} due ${new Date(payments[0].dueDate).toLocaleDateString("en-BD")}`
      : `Payment schedule created: ${payments.length} payments totalling ${formatBDT(total)}`;

  await prisma.$transaction([
    prisma.payment.createMany({
      data: payments.map((p) => ({
        tenantId: session.user.tenantId,
        leadId,
        propertyId,
        type: p.type,
        amount: p.amount,
        dueDate: new Date(p.dueDate),
        note: p.note,
      })),
    }),
    prisma.leadActivity.create({
      data: { leadId, createdById: session.user.id, type: "payment", description },
    }),
    // Convenience: creating a schedule against an available property books it.
    // One-way only — never auto-SOLD, never auto-reverted.
    ...(property && property.status === "AVAILABLE"
      ? [prisma.property.update({ where: { id: property.id }, data: { status: "BOOKED" as const } })]
      : []),
  ]);

  return NextResponse.json({ created: payments.length }, { status: 201 });
}
