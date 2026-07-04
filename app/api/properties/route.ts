import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { parseJsonBody } from "@/lib/parse-body";

export async function GET() {
  const { error, session } = await requirePermission(PERMISSIONS.PROPERTIES_VIEW);
  if (error) return error;

  const properties = await prisma.property.findMany({
    where: { tenantId: session.user.tenantId },
    include: { _count: { select: { leads: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(properties);
}

const createPropertySchema = z.object({
  title: z.string().min(2),
  type: z.enum(["APARTMENT", "LAND", "COMMERCIAL"]),
  price: z.number().positive(),
  sizeSqft: z.number().positive().optional(),
  floor: z.number().int().optional(),
  bedrooms: z.number().int().positive().optional(),
  locationArea: z.string().min(1),
  projectName: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  photoUrls: z.array(z.string().url()).max(8).default([]),
});

export async function POST(req: Request) {
  const { error, session } = await requirePermission(PERMISSIONS.PROPERTIES_CREATE);
  if (error) return error;

  const { data: body, error: bodyError } = await parseJsonBody(req);

  if (bodyError) return bodyError;
  const parsed = createPropertySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const property = await prisma.property.create({
    data: { ...parsed.data, tenantId: session.user.tenantId },
  });

  return NextResponse.json(property, { status: 201 });
}
