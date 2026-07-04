import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { canEditLead } from "@/lib/lead-permissions";
import { getSession } from "@/lib/session";
import { parseJsonBody } from "@/lib/parse-body";

const linkSchema = z.object({
  propertyId: z.string().min(1),
});

async function resolve(req: Request, leadId: string) {
  const session = await getSession();
  if (!session) return { error: new Response("Unauthorized", { status: 401 }) } as const;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId: session.user.tenantId },
  });
  if (!lead) return { error: new Response("Not found", { status: 404 }) } as const;

  if (!(await canEditLead(session.user, lead))) {
    return { error: new Response("Forbidden", { status: 403 }) } as const;
  }

  const { data: body, error: bodyError } = await parseJsonBody(req);
  if (bodyError) return { error: bodyError } as const;
  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) {
    return { error: NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }) } as const;
  }

  const property = await prisma.property.findFirst({
    where: { id: parsed.data.propertyId, tenantId: session.user.tenantId },
    select: { id: true, title: true },
  });
  if (!property) return { error: new Response("Not found", { status: 404 }) } as const;

  return { session, lead, property } as const;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await resolve(req, id);
  if (result.error) return result.error;
  const { session, property } = result;

  const existing = await prisma.leadProperty.findUnique({
    where: { leadId_propertyId: { leadId: id, propertyId: property.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "This property is already linked" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.leadProperty.create({ data: { leadId: id, propertyId: property.id } }),
    prisma.leadActivity.create({
      data: {
        leadId: id,
        createdById: session.user.id,
        type: "note",
        description: `Linked property: ${property.title}`,
      },
    }),
  ]);

  return NextResponse.json({ linked: true }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await resolve(req, id);
  if (result.error) return result.error;
  const { session, property } = result;

  const existing = await prisma.leadProperty.findUnique({
    where: { leadId_propertyId: { leadId: id, propertyId: property.id } },
  });
  if (!existing) return new Response("Not found", { status: 404 });

  await prisma.$transaction([
    prisma.leadProperty.delete({
      where: { leadId_propertyId: { leadId: id, propertyId: property.id } },
    }),
    prisma.leadActivity.create({
      data: {
        leadId: id,
        createdById: session.user.id,
        type: "note",
        description: `Unlinked property: ${property.title}`,
      },
    }),
  ]);

  return NextResponse.json({ unlinked: true });
}
