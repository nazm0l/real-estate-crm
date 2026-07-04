import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { parseJsonBody } from "@/lib/parse-body";

const createVisitSchema = z.object({
  leadId: z.string(),
  scheduledAt: z.string().datetime(),
  location: z.string().min(1),
  note: z.string().optional(),
  agentId: z.string().optional(),
});

export async function POST(req: Request) {
  const { error, session } = await requirePermission(PERMISSIONS.VISITS_MANAGE);
  if (error) return error;

  const { data: body, error: bodyError } = await parseJsonBody(req);

  if (bodyError) return bodyError;
  const parsed = createVisitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { leadId, scheduledAt, location, note, agentId } = parsed.data;

  const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId: session.user.tenantId } });
  if (!lead) return new Response("Not found", { status: 404 });

  let assignedAgent = { id: session.user.id, name: session.user.name };
  if (agentId && agentId !== session.user.id) {
    const agent = await prisma.user.findFirst({
      where: { id: agentId, tenantId: session.user.tenantId },
      select: { id: true, name: true },
    });
    if (!agent) return NextResponse.json({ error: "Invalid agent" }, { status: 400 });
    assignedAgent = agent;
  }

  const scheduledDate = new Date(scheduledAt);
  const assignedNote =
    assignedAgent.id !== session.user.id ? ` (assigned to ${assignedAgent.name})` : "";
  const [visit] = await prisma.$transaction([
    prisma.siteVisit.create({
      data: {
        tenantId: session.user.tenantId,
        leadId,
        agentId: assignedAgent.id,
        scheduledAt: scheduledDate,
        location,
        note,
      },
    }),
    prisma.leadActivity.create({
      data: {
        leadId,
        createdById: session.user.id,
        type: "visit",
        description: `Site visit scheduled for ${scheduledDate.toLocaleString("en-BD")} at ${location}${assignedNote}`,
      },
    }),
  ]);

  return NextResponse.json(visit, { status: 201 });
}
