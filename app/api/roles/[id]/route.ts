import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { parseJsonBody } from "@/lib/parse-body";

const updateRoleSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, session } = await requirePermission(PERMISSIONS.ROLES_MANAGE);
  if (error) return error;

  const role = await prisma.role.findFirst({ where: { id, tenantId: session.user.tenantId } });
  if (!role) return new Response("Not found", { status: 404 });
  if (role.isSystem) return new Response("This role cannot be modified", { status: 403 });

  const { data: body, error: bodyError } = await parseJsonBody(req);

  if (bodyError) return bodyError;
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.role.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, session } = await requirePermission(PERMISSIONS.ROLES_MANAGE);
  if (error) return error;

  const role = await prisma.role.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: { _count: { select: { users: true } } },
  });
  if (!role) return new Response("Not found", { status: 404 });
  if (role.isSystem) return new Response("This role cannot be deleted", { status: 403 });
  if (role._count.users > 0) {
    return new Response("Reassign users away from this role before deleting it", { status: 400 });
  }

  await prisma.role.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
