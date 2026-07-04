import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PERMISSIONS, invalidatePermissionCache } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { parseJsonBody } from "@/lib/parse-body";

const togglePermissionSchema = z.object({
  permission: z.enum(Object.values(PERMISSIONS) as [string, ...string[]]),
  enabled: z.boolean(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, session } = await requirePermission(PERMISSIONS.ROLES_MANAGE);
  if (error) return error;

  const role = await prisma.role.findFirst({ where: { id, tenantId: session.user.tenantId } });
  if (!role) return new Response("Not found", { status: 404 });
  if (role.isSystem) {
    return new Response("Company Admin permissions cannot be changed", { status: 403 });
  }

  const { data: body, error: bodyError } = await parseJsonBody(req);

  if (bodyError) return bodyError;
  const parsed = togglePermissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { permission, enabled } = parsed.data;

  if (enabled) {
    await prisma.rolePermission.upsert({
      where: { roleId_permission: { roleId: id, permission } },
      create: { roleId: id, permission },
      update: {},
    });
  } else {
    await prisma.rolePermission
      .delete({ where: { roleId_permission: { roleId: id, permission } } })
      .catch(() => null);
  }

  invalidatePermissionCache(id);

  return NextResponse.json({ ok: true });
}
