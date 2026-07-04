import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { RolesMatrix } from "@/components/settings/RolesMatrix";

export default async function RolesSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await hasPermission(session.user.roleId, PERMISSIONS.ROLES_VIEW))) redirect("/");

  const roles = await prisma.role.findMany({
    where: { tenantId: session.user.tenantId },
    include: { permissions: true, _count: { select: { users: true } } },
    orderBy: { createdAt: "asc" },
  });

  return <RolesMatrix initialRoles={roles} />;
}
