import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { parseJsonBody } from "@/lib/parse-body";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, session } = await requirePermission(PERMISSIONS.PROPERTIES_VIEW);
  if (error) return error;

  const property = await prisma.property.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      leads: {
        select: {
          lead: { select: { id: true, name: true, phone: true, pipelineStage: true } },
        },
      },
    },
  });
  if (!property) return new Response("Not found", { status: 404 });

  return NextResponse.json(property);
}

const updatePropertySchema = z.object({
  title: z.string().min(2).optional(),
  type: z.enum(["APARTMENT", "LAND", "COMMERCIAL"]).optional(),
  price: z.number().positive().optional(),
  sizeSqft: z.number().positive().nullable().optional(),
  floor: z.number().int().nullable().optional(),
  bedrooms: z.number().int().positive().nullable().optional(),
  locationArea: z.string().min(1).optional(),
  projectName: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  photoUrls: z.array(z.string().url()).max(8).optional(),
  status: z.enum(["AVAILABLE", "BOOKED", "SOLD"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, session } = await requirePermission(PERMISSIONS.PROPERTIES_EDIT);
  if (error) return error;

  const property = await prisma.property.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!property) return new Response("Not found", { status: 404 });

  const { data: body, error: bodyError } = await parseJsonBody(req);

  if (bodyError) return bodyError;
  const parsed = updatePropertySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.property.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}
