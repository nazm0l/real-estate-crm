import { headers, cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  roleId: string;
  roleName: string;
  isPlatformAdmin: boolean;
  // Non-null when a platform admin has "entered" a tenant other than their own —
  // tenantId/roleId above already reflect that tenant in this case.
  actingAsTenant: { id: string; companyName: string } | null;
};

export async function getSession(): Promise<{ user: SessionUser } | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      tenantId: true,
      roleId: true,
      isPlatformAdmin: true,
      role: { select: { name: true } },
    },
  });
  if (!dbUser) return null;

  let tenantId = dbUser.tenantId;
  let roleId = dbUser.roleId;
  let roleName = dbUser.role.name;
  let actingAsTenant: SessionUser["actingAsTenant"] = null;

  if (dbUser.isPlatformAdmin) {
    const store = await cookies();
    const activeTenantId = store.get("platform_active_tenant")?.value;
    const activeRoleId = store.get("platform_active_role")?.value;

    if (activeTenantId && activeRoleId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: activeTenantId },
        select: { id: true, companyName: true },
      });
      if (tenant) {
        tenantId = tenant.id;
        roleId = activeRoleId;
        roleName = "Company Admin";
        actingAsTenant = tenant;
      }
    }
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      tenantId,
      roleId,
      roleName,
      isPlatformAdmin: dbUser.isPlatformAdmin,
      actingAsTenant,
    },
  };
}
