import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { TeamManager } from "@/components/settings/TeamManager";

export default async function TeamSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await hasPermission(session.user.roleId, PERMISSIONS.TEAM_VIEW))) redirect("/");
  const tenantId = session.user.tenantId;

  const [members, roles] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true, email: true, role: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return <TeamManager initialMembers={members} roles={roles} currentUserId={session.user.id} />;
}
