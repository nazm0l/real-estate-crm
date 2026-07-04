import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { VisitCalendar } from "@/components/visits/VisitCalendar";

export default async function VisitsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await hasPermission(session.user.roleId, PERMISSIONS.VISITS_VIEW))) redirect("/");

  const [visits, canManage] = await Promise.all([
    prisma.siteVisit.findMany({
      where: { tenantId: session.user.tenantId },
      select: {
        id: true,
        scheduledAt: true,
        location: true,
        status: true,
        note: true,
        lead: { select: { id: true, name: true, phone: true } },
        agent: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    hasPermission(session.user.roleId, PERMISSIONS.VISITS_MANAGE),
  ]);

  const [agents, leads] = canManage
    ? await Promise.all([
        prisma.user.findMany({
          where: { tenantId: session.user.tenantId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        prisma.lead.findMany({
          where: { tenantId: session.user.tenantId, pipelineStage: { notIn: ["LOST"] } },
          select: { id: true, name: true, locationArea: true },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], []];

  const initialVisits = visits.map((visit) => ({
    ...visit,
    scheduledAt: visit.scheduledAt.toISOString(),
  }));

  return (
    <VisitCalendar
      visits={initialVisits}
      canManage={canManage}
      agents={agents}
      leads={leads}
      currentUserId={session.user.id}
    />
  );
}
