import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { WorkspaceForm } from "@/components/settings/WorkspaceForm";

export default async function WorkspaceSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await hasPermission(session.user.roleId, PERMISSIONS.ROLES_MANAGE))) redirect("/");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
  });

  if (!tenant) return null;

  return (
    <WorkspaceForm
      initialCompanyName={tenant.companyName}
      initialLogoUrl={tenant.logoUrl}
      initialMetaAdAccountId={tenant.metaAdAccountId}
      hasMetaToken={!!tenant.metaAccessToken}
    />
  );
}
