import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { normalizeBDPhone } from "@/lib/bd-phone";
import { autoScoreLead } from "@/lib/ai-score";
import { getLanguage } from "@/lib/language";
import { parseJsonBody } from "@/lib/parse-body";

export async function GET() {
  const { error, session } = await requirePermission(PERMISSIONS.LEADS_VIEW);
  if (error) return error;

  const leads = await prisma.lead.findMany({
    where: { tenantId: session.user.tenantId },
    include: { agent: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(leads);
}

const createLeadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  source: z.enum(["MANUAL", "WEBSITE", "FACEBOOK", "INSTAGRAM", "REFERRAL"]).default("MANUAL"),
  propertyType: z.enum(["APARTMENT", "LAND", "COMMERCIAL"]).optional(),
  budgetMin: z.number().positive().optional(),
  budgetMax: z.number().positive().optional(),
  locationArea: z.string().optional(),
  nextFollowUpAt: z.string().datetime().optional(),
  agentId: z.string().optional(),
});

export async function POST(req: Request) {
  const { error, session } = await requirePermission(PERMISSIONS.LEADS_CREATE);
  if (error) return error;

  const { data: body, error: bodyError } = await parseJsonBody(req);

  if (bodyError) return bodyError;
  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, agentId, ...rest } = parsed.data;

  const normalizedPhone = normalizeBDPhone(rest.phone);
  if (!normalizedPhone) {
    return NextResponse.json({ error: "Enter a valid Bangladeshi mobile number" }, { status: 400 });
  }

  const existing = await prisma.lead.findFirst({
    where: { tenantId: session.user.tenantId, phone: normalizedPhone },
    select: { id: true, name: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A lead with this phone number already exists", existingLeadId: existing.id },
      { status: 409 }
    );
  }

  let resolvedAgentId = session.user.id;
  if (agentId && agentId !== session.user.id) {
    const canAssign = await hasPermission(session.user.roleId, PERMISSIONS.LEADS_ASSIGN);
    if (!canAssign) return new Response("Forbidden", { status: 403 });
    resolvedAgentId = agentId;
  }

  const lead = await prisma.lead.create({
    data: {
      ...rest,
      phone: normalizedPhone,
      email: email || undefined,
      tenantId: session.user.tenantId,
      agentId: resolvedAgentId,
      nextFollowUpAt: rest.nextFollowUpAt ? new Date(rest.nextFollowUpAt) : undefined,
      activities: {
        create: { createdById: session.user.id, type: "note", description: "Lead created" },
      },
    },
  });

  // Auto-score fire-and-forget (best-effort; user can always rescore manually)
  if (process.env.ANTHROPIC_API_KEY) {
    const lang = await getLanguage()
    autoScoreLead(lead.id, session.user.tenantId, lang).catch(() => {})
  }

  return NextResponse.json(lead, { status: 201 });
}
