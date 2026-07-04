import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { canEditLead } from "@/lib/lead-permissions";
import { getSession } from "@/lib/session";
import { normalizeBDPhone } from "@/lib/bd-phone";
import { autoScoreLead } from "@/lib/ai-score";
import { getLanguage } from "@/lib/language";
import { parseJsonBody } from "@/lib/parse-body";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, session } = await requirePermission(PERMISSIONS.LEADS_VIEW);
  if (error) return error;

  const lead = await prisma.lead.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      agent: { select: { id: true, name: true } },
      activities: { include: { createdBy: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
      interestedIn: { include: { property: true } },
      payments: true,
      siteVisits: { orderBy: { scheduledAt: "desc" } },
    },
  });
  if (!lead) return new Response("Not found", { status: 404 });

  return NextResponse.json(lead);
}

const updateLeadSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  source: z.enum(["MANUAL", "WEBSITE", "FACEBOOK", "INSTAGRAM", "REFERRAL"]).optional(),
  propertyType: z.enum(["APARTMENT", "LAND", "COMMERCIAL"]).optional(),
  budgetMin: z.number().positive().optional(),
  budgetMax: z.number().positive().optional(),
  locationArea: z.string().optional(),
  pipelineStage: z
    .enum(["NEW", "CONTACTED", "INTERESTED", "SITE_VISIT", "NEGOTIATION", "BOOKED", "LOST"])
    .optional(),
  nextFollowUpAt: z.string().datetime().nullable().optional(),
  agentId: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const lead = await prisma.lead.findFirst({ where: { id, tenantId: session.user.tenantId } });
  if (!lead) return new Response("Not found", { status: 404 });

  if (!(await canEditLead(session.user, lead))) {
    return new Response("Forbidden", { status: 403 });
  }

  const { data: body, error: bodyError } = await parseJsonBody(req);

  if (bodyError) return bodyError;
  const parsed = updateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, agentId, phone, nextFollowUpAt, ...rest } = parsed.data;

  if (agentId !== undefined && agentId !== lead.agentId) {
    const canAssign = await hasPermission(session.user.roleId, PERMISSIONS.LEADS_ASSIGN);
    if (!canAssign) return new Response("Forbidden", { status: 403 });
  }

  let normalizedPhone: string | undefined;
  if (phone !== undefined) {
    normalizedPhone = normalizeBDPhone(phone) ?? undefined;
    if (!normalizedPhone) {
      return NextResponse.json({ error: "Enter a valid Bangladeshi mobile number" }, { status: 400 });
    }
    const existing = await prisma.lead.findFirst({
      where: { tenantId: session.user.tenantId, phone: normalizedPhone, NOT: { id } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A lead with this phone number already exists", existingLeadId: existing.id },
        { status: 409 }
      );
    }
  }

  const stageChanged = rest.pipelineStage !== undefined && rest.pipelineStage !== lead.pipelineStage;
  const budgetChanged =
    (parsed.data.budgetMin !== undefined && parsed.data.budgetMin !== lead.budgetMin) ||
    (parsed.data.budgetMax !== undefined && parsed.data.budgetMax !== lead.budgetMax);

  const [updated] = await prisma.$transaction([
    prisma.lead.update({
      where: { id },
      data: {
        ...rest,
        ...(normalizedPhone !== undefined ? { phone: normalizedPhone } : {}),
        ...(email !== undefined ? { email: email || null } : {}),
        ...(agentId !== undefined ? { agentId } : {}),
        ...(nextFollowUpAt !== undefined
          ? { nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null }
          : {}),
      },
    }),
    ...(stageChanged
      ? [
          prisma.leadActivity.create({
            data: {
              leadId: id,
              createdById: session.user.id,
              type: "stage_change",
              description: `Stage changed from ${lead.pipelineStage} to ${rest.pipelineStage}`,
            },
          }),
        ]
      : []),
  ]);

  // Re-score fire-and-forget on significant changes
  if (process.env.ANTHROPIC_API_KEY && (stageChanged || budgetChanged)) {
    const lang = await getLanguage()
    autoScoreLead(id, session.user.tenantId, lang).catch(() => {})
  }

  return NextResponse.json(updated);
}
