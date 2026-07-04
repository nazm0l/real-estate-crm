import { getSession } from "@/lib/session";
import { hasPermission, type Permission } from "@/lib/permissions";

export async function requirePermission(permission: Permission) {
  const session = await getSession();
  if (!session) return { error: new Response("Unauthorized", { status: 401 }) } as const;

  const allowed = await hasPermission(session.user.roleId, permission);
  if (!allowed) return { error: new Response("Forbidden", { status: 403 }) } as const;

  return { session } as const;
}
