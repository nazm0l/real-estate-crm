import { prisma } from "@/lib/db";

export const PERMISSIONS = {
  // Leads
  LEADS_VIEW: "leads:view",
  LEADS_CREATE: "leads:create",
  LEADS_EDIT_OWN: "leads:edit_own",
  LEADS_EDIT_ANY: "leads:edit_any",
  LEADS_DELETE: "leads:delete",
  LEADS_ASSIGN: "leads:assign",
  LEADS_EXPORT: "leads:export",

  // Properties
  PROPERTIES_VIEW: "properties:view",
  PROPERTIES_CREATE: "properties:create",
  PROPERTIES_EDIT: "properties:edit",
  PROPERTIES_DELETE: "properties:delete",

  // Payments
  PAYMENTS_VIEW: "payments:view",
  PAYMENTS_CREATE: "payments:create",
  PAYMENTS_MARK_PAID: "payments:mark_paid",
  PAYMENTS_DELETE: "payments:delete",

  // Site visits
  VISITS_VIEW: "visits:view",
  VISITS_MANAGE: "visits:manage",

  // Meta Ads
  ADS_VIEW: "ads:view",
  ADS_SYNC: "ads:sync",

  // Team & roles
  TEAM_VIEW: "team:view",
  TEAM_INVITE: "team:invite",
  TEAM_REMOVE: "team:remove",
  ROLES_VIEW: "roles:view",
  ROLES_MANAGE: "roles:manage",

  // AI & reports
  AI_SCORE_LEADS: "ai:score_leads",
  AI_CHAT: "ai:chat",
  REPORTS_VIEW: "reports:view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  "Company Admin": Object.values(PERMISSIONS),
  Manager: [
    PERMISSIONS.LEADS_VIEW,
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.LEADS_EDIT_OWN,
    PERMISSIONS.LEADS_EDIT_ANY,
    PERMISSIONS.LEADS_ASSIGN,
    PERMISSIONS.LEADS_EXPORT,
    PERMISSIONS.PROPERTIES_VIEW,
    PERMISSIONS.PROPERTIES_CREATE,
    PERMISSIONS.PROPERTIES_EDIT,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PAYMENTS_CREATE,
    PERMISSIONS.PAYMENTS_MARK_PAID,
    PERMISSIONS.VISITS_VIEW,
    PERMISSIONS.VISITS_MANAGE,
    PERMISSIONS.ADS_VIEW,
    PERMISSIONS.ADS_SYNC,
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.ROLES_VIEW,
    PERMISSIONS.AI_SCORE_LEADS,
    PERMISSIONS.AI_CHAT,
    PERMISSIONS.REPORTS_VIEW,
  ],
  Agent: [
    PERMISSIONS.LEADS_VIEW,
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.LEADS_EDIT_OWN,
    PERMISSIONS.PROPERTIES_VIEW,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.VISITS_VIEW,
    PERMISSIONS.VISITS_MANAGE,
    PERMISSIONS.AI_CHAT,
  ],
  Viewer: [PERMISSIONS.LEADS_VIEW, PERMISSIONS.PROPERTIES_VIEW, PERMISSIONS.REPORTS_VIEW],
};

const permissionCache = new Map<string, Set<string>>();

export async function getUserPermissions(roleId: string): Promise<Set<string>> {
  if (permissionCache.has(roleId)) return permissionCache.get(roleId)!;
  const rolePerms = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permission: true },
  });
  const perms = new Set(rolePerms.map((p) => p.permission));
  permissionCache.set(roleId, perms);
  return perms;
}

export function invalidatePermissionCache(roleId: string) {
  permissionCache.delete(roleId);
}

export async function hasPermission(roleId: string, permission: Permission): Promise<boolean> {
  const perms = await getUserPermissions(roleId);
  return perms.has(permission);
}
