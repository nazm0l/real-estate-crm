import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasPermission, getUserPermissions, PERMISSIONS, type Permission } from "@/lib/permissions";
import { getLanguage } from "@/lib/language";
import { getNotifications } from "@/lib/notifications";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [tenant, canChat, lang, notifications, grantedPermissions] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { companyName: true },
    }),
    hasPermission(session.user.roleId, PERMISSIONS.AI_CHAT),
    getLanguage(),
    getNotifications(session.user.tenantId, session.user.roleId),
    getUserPermissions(session.user.roleId),
  ]);

  return (
    <DashboardShell
      companyName={tenant?.companyName ?? "Workspace"}
      userName={session.user.name}
      userEmail={session.user.email}
      roleName={session.user.roleName}
      lang={lang}
      canChat={canChat}
      notifications={notifications}
      isPlatformAdmin={session.user.isPlatformAdmin}
      actingAsTenant={session.user.actingAsTenant}
      permissions={[...grantedPermissions] as Permission[]}
    >
      {children}
    </DashboardShell>
  );
}
