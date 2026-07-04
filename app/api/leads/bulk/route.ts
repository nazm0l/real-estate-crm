import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { parseJsonBody } from "@/lib/parse-body";

const bulkSchema = z
  .object({
    ids: z.array(z.string()).min(1).max(100),
    agentId: z.string().nullable().optional(),
    pipelineStage: z
      .enum(["NEW", "CONTACTED", "INTERESTED", "SITE_VISIT", "NEGOTIATION", "BOOKED", "LOST"])
      .optional(),
  })
  .refine((d) => d.agentId !== undefined || d.pipelineStage !== undefined, {
    message: "Nothing to update",
  });

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { data: body, error: bodyError } = await parseJsonBody(req);

  if (bodyError) return bodyError;
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { ids, agentId, pipelineStage } = parsed.data;

  if (agentId !== undefined) {
    const canAssign = await hasPermission(session.user.roleId, PERMISSIONS.LEADS_ASSIGN);
    if (!canAssign) return new Response("Forbidden", { status: 403 });
  }
  if (pipelineStage !== undefined) {
    const canEditAny = await hasPermission(session.user.roleId, PERMISSIONS.LEADS_EDIT_ANY);
    if (!canEditAny) return new Response("Forbidden", { status: 403 });
  }

  // tenantId in the where clause keeps foreign ids out — the count reflects only own-tenant rows
  const leads = await prisma.lead.findMany({
    where: { id: { in: ids }, tenantId: session.user.tenantId },
    select: { id: true, pipelineStage: true },
  });
  if (leads.length === 0) return NextResponse.json({ updated: 0 });

  const ownIds = leads.map((l) => l.id);
  await prisma.lead.updateMany({
    where: { id: { in: ownIds }, tenantId: session.user.tenantId },
    data: {
      ...(agentId !== undefined ? { agentId } : {}),
      ...(pipelineStage !== undefined ? { pipelineStage } : {}),
    },
  });

  if (pipelineStage !== undefined) {
    const changed = leads.filter((l) => l.pipelineStage !== pipelineStage);
    if (changed.length) {
      await prisma.leadActivity.createMany({
        data: changed.map((l) => ({
          leadId: l.id,
          createdById: session.user.id,
          type: "stage_change",
          description: `Stage changed from ${l.pipelineStage} to ${pipelineStage} (bulk update)`,
        })),
      });
    }
  }

  return NextResponse.json({ updated: ownIds.length });
}
