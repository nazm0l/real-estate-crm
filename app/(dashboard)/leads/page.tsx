import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { LeadsView } from "@/components/leads/LeadsView";

export default async function LeadsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await hasPermission(session.user.roleId, PERMISSIONS.LEADS_VIEW))) redirect("/");

  const [leads, agents, canCreate, canEditOwn, canEditAny, canAssign, canViewProperties] =
    await Promise.all([
      prisma.lead.findMany({
        where: { tenantId: session.user.tenantId },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          source: true,
          propertyType: true,
          budgetMin: true,
          budgetMax: true,
          locationArea: true,
          pipelineStage: true,
          nextFollowUpAt: true,
          aiScore: true,
          agentId: true,
          agent: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { tenantId: session.user.tenantId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      hasPermission(session.user.roleId, PERMISSIONS.LEADS_CREATE),
      hasPermission(session.user.roleId, PERMISSIONS.LEADS_EDIT_OWN),
      hasPermission(session.user.roleId, PERMISSIONS.LEADS_EDIT_ANY),
      hasPermission(session.user.roleId, PERMISSIONS.LEADS_ASSIGN),
      hasPermission(session.user.roleId, PERMISSIONS.PROPERTIES_VIEW),
    ]);

  const properties = canViewProperties
    ? await prisma.property.findMany({
        where: { tenantId: session.user.tenantId },
        select: { id: true, title: true, locationArea: true },
        orderBy: { title: "asc" },
      })
    : [];

  const initialLeads = leads.map((lead) => ({
    ...lead,
    nextFollowUpAt: lead.nextFollowUpAt ? lead.nextFollowUpAt.toISOString() : null,
  }));

  return (
    <LeadsView
      initialLeads={initialLeads}
      agents={agents}
      properties={properties}
      canCreate={canCreate}
      canEditOwn={canEditOwn}
      canEditAny={canEditAny}
      canAssign={canAssign}
      currentUserId={session.user.id}
    />
  );
}
