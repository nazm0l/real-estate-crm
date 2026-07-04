import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { parseJsonBody } from "@/lib/parse-body";

const updateMemberSchema = z.object({
  roleId: z.string(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, session } = await requirePermission(PERMISSIONS.TEAM_INVITE);
  if (error) return error;

  const member = await prisma.user.findFirst({ where: { id, tenantId: session.user.tenantId } });
  if (!member) return new Response("Not found", { status: 404 });

  const { data: body, error: bodyError } = await parseJsonBody(req);

  if (bodyError) return bodyError;
  const parsed = updateMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const role = await prisma.role.findFirst({
    where: { id: parsed.data.roleId, tenantId: session.user.tenantId },
  });
  if (!role) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id },
    data: { roleId: role.id },
    select: { id: true, name: true, email: true, role: { select: { id: true, name: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, session } = await requirePermission(PERMISSIONS.TEAM_REMOVE);
  if (error) return error;

  const member = await prisma.user.findFirst({ where: { id, tenantId: session.user.tenantId } });
  if (!member) return new Response("Not found", { status: 404 });

  if (member.id === session.user.id) {
    return new Response("You cannot remove yourself", { status: 400 });
  }

  const companyAdminRole = await prisma.role.findFirst({
    where: { tenantId: session.user.tenantId, isSystem: true },
  });
  if (member.roleId === companyAdminRole?.id) {
    const adminCount = await prisma.user.count({ where: { roleId: companyAdminRole.id } });
    if (adminCount <= 1) {
      return new Response("Cannot remove the last Company Admin", { status: 400 });
    }
  }

  await prisma.user.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
