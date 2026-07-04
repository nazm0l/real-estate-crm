import { getUserPermissions, PERMISSIONS } from "@/lib/permissions";
import type { SessionUser } from "@/lib/session";

export async function canEditLead(
  user: SessionUser,
  lead: { agentId: string | null }
): Promise<boolean> {
  const perms = await getUserPermissions(user.roleId);
  if (perms.has(PERMISSIONS.LEADS_EDIT_ANY)) return true;
  return perms.has(PERMISSIONS.LEADS_EDIT_OWN) && lead.agentId === user.id;
}
