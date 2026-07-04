import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { canEditLead } from "@/lib/lead-permissions";
import { getSession } from "@/lib/session";
import { parseJsonBody } from "@/lib/parse-body";

const createActivitySchema = z.object({
  type: z.enum(["call", "note"]),
  description: z.string().min(1),
  nextFollowUpAt: z.string().datetime().nullable().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const parsed = createActivitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { type, description, nextFollowUpAt } = parsed.data;

  const [activity] = await prisma.$transaction([
    prisma.leadActivity.create({
      data: { leadId: id, createdById: session.user.id, type, description },
    }),
    ...(nextFollowUpAt !== undefined
      ? [
          prisma.lead.update({
            where: { id },
            data: { nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt) : null },
          }),
        ]
      : []),
  ]);

  return NextResponse.json(activity, { status: 201 });
}
