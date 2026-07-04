import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { parseJsonBody } from "@/lib/parse-body";

const STATUS_DESCRIPTIONS = {
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "marked as no-show",
} as const;

const updateVisitSchema = z.object({
  status: z.enum(["COMPLETED", "CANCELLED", "NO_SHOW"]),
  note: z.string().max(1000).optional(),
  nextFollowUpAt: z.string().datetime().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, session } = await requirePermission(PERMISSIONS.VISITS_MANAGE);
  if (error) return error;

  const visit = await prisma.siteVisit.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!visit) return new Response("Not found", { status: 404 });
  if (visit.status !== "SCHEDULED") {
    return NextResponse.json({ error: "This visit was already resolved" }, { status: 409 });
  }

  const { data: body, error: bodyError } = await parseJsonBody(req);

  if (bodyError) return bodyError;
  const parsed = updateVisitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { status, note, nextFollowUpAt } = parsed.data;

  const mergedNote = note?.trim()
    ? visit.note
      ? `${visit.note}\n${note.trim()}`
      : note.trim()
    : visit.note;

  const [updated] = await prisma.$transaction([
    prisma.siteVisit.update({
      where: { id },
      data: { status, note: mergedNote },
    }),
    prisma.leadActivity.create({
      data: {
        leadId: visit.leadId,
        createdById: session.user.id,
        type: "visit",
        description: `Site visit ${STATUS_DESCRIPTIONS[status]} at ${visit.location}${note?.trim() ? ` — ${note.trim()}` : ""}`,
      },
    }),
    // Completion may set the lead's next follow-up in the same transaction.
    ...(status === "COMPLETED" && nextFollowUpAt
      ? [
          prisma.lead.update({
            where: { id: visit.leadId },
            data: { nextFollowUpAt: new Date(nextFollowUpAt) },
          }),
        ]
      : []),
  ]);

  return NextResponse.json(updated);
}
