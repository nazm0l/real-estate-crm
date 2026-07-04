import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { parseJsonBody } from "@/lib/parse-body";

export async function GET() {
  const { error, session } = await requirePermission(PERMISSIONS.ROLES_VIEW);
  if (error) return error;

  const roles = await prisma.role.findMany({
    where: { tenantId: session.user.tenantId },
    include: { permissions: true, _count: { select: { users: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(roles);
}

const createRoleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

export async function POST(req: Request) {
  const { error, session } = await requirePermission(PERMISSIONS.ROLES_MANAGE);
  if (error) return error;

  const { data: body, error: bodyError } = await parseJsonBody(req);

  if (bodyError) return bodyError;
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const role = await prisma.role.create({
    data: {
      tenantId: session.user.tenantId,
      name: parsed.data.name,
      description: parsed.data.description,
    },
  });

  return NextResponse.json(role, { status: 201 });
}
