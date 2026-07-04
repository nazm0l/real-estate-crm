import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getLanguage } from "@/lib/language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FollowUpBar } from "@/components/leads/FollowUpBar";
import { LeadDetailPanel } from "@/components/leads/LeadDetailPanel";
import { QuickActions } from "@/components/leads/QuickActions";
import { ActivityTimeline } from "@/components/leads/ActivityTimeline";
import { LinkedPropertiesCard } from "@/components/leads/LinkedPropertiesCard";
import { PaymentSchedule } from "@/components/payments/PaymentSchedule";
import { SiteVisitsCard } from "@/components/visits/SiteVisitsCard";
import { ScoreLeadButton } from "@/components/leads/ScoreLeadButton";
import { BackLink } from "@/components/layout/BackLink";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await hasPermission(session.user.roleId, PERMISSIONS.LEADS_VIEW))) redirect("/");

  const lead = await prisma.lead.findFirst({
    where: { id, tenantId: session.user.tenantId },
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
      aiScoreReason: true,
      aiScoredAt: true,
      agentId: true,
      agent: { select: { id: true, name: true } },
      activities: {
        select: {
          id: true,
          type: true,
          description: true,
          createdAt: true,
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      siteVisits: {
        select: {
          id: true,
          scheduledAt: true,
          location: true,
          status: true,
          note: true,
          agent: { select: { name: true } },
        },
        orderBy: { scheduledAt: "desc" },
      },
      interestedIn: {
        select: {
          property: {
            select: { id: true, title: true, price: true, status: true, locationArea: true },
          },
        },
      },
      payments: {
        select: {
          id: true,
          type: true,
          amount: true,
          dueDate: true,
          paidDate: true,
          status: true,
          method: true,
          reference: true,
          note: true,
        },
        orderBy: { dueDate: "asc" },
      },
    },
  });
  if (!lead) notFound();

  const [lang, agents, canEditOwn,
    canEditAny,
    canAssign,
    canScheduleVisit,
    canViewProperties,
    canViewPayments,
    canCreatePayments,
    canMarkPaid,
    canDeletePayments,
    canScoreLead,
  ] = await Promise.all([
    getLanguage(),
    prisma.user.findMany({
      where: { tenantId: session.user.tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    hasPermission(session.user.roleId, PERMISSIONS.LEADS_EDIT_OWN),
    hasPermission(session.user.roleId, PERMISSIONS.LEADS_EDIT_ANY),
    hasPermission(session.user.roleId, PERMISSIONS.LEADS_ASSIGN),
    hasPermission(session.user.roleId, PERMISSIONS.VISITS_MANAGE),
    hasPermission(session.user.roleId, PERMISSIONS.PROPERTIES_VIEW),
    hasPermission(session.user.roleId, PERMISSIONS.PAYMENTS_VIEW),
    hasPermission(session.user.roleId, PERMISSIONS.PAYMENTS_CREATE),
    hasPermission(session.user.roleId, PERMISSIONS.PAYMENTS_MARK_PAID),
    hasPermission(session.user.roleId, PERMISSIONS.PAYMENTS_DELETE),
    hasPermission(session.user.roleId, PERMISSIONS.AI_SCORE_LEADS),
  ]);

  const canEdit = canEditAny || (canEditOwn && lead.agentId === session.user.id);

  const propertyOptions =
    canEdit && canViewProperties
      ? await prisma.property.findMany({
          where: { tenantId: session.user.tenantId },
          select: { id: true, title: true },
          orderBy: { title: "asc" },
        })
      : [];

  const linkedProperties = lead.interestedIn.map((link) => link.property);

  const leadDetail = {
    ...lead,
    nextFollowUpAt: lead.nextFollowUpAt ? lead.nextFollowUpAt.toISOString() : null,
    activities: lead.activities.map((activity) => ({
      ...activity,
      createdAt: activity.createdAt.toISOString(),
    })),
    siteVisits: lead.siteVisits.map((visit) => ({
      ...visit,
      scheduledAt: visit.scheduledAt.toISOString(),
    })),
  };

  const payments = lead.payments.map((payment) => ({
    ...payment,
    dueDate: payment.dueDate.toISOString(),
    paidDate: payment.paidDate ? payment.paidDate.toISOString() : null,
  }));

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <BackLink href="/leads" label="Leads" />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{leadDetail.name}</h1>
          <p className="text-sm text-muted-foreground">{leadDetail.locationArea ?? "No location set"}</p>
        </div>
        {canScoreLead && (
          <ScoreLeadButton
            leadId={leadDetail.id}
            currentScore={leadDetail.aiScore}
            currentReason={leadDetail.aiScoreReason}
            lang={lang}
          />
        )}
      </div>

      <FollowUpBar leadId={leadDetail.id} nextFollowUpAt={leadDetail.nextFollowUpAt} canEdit={canEdit} />

      <QuickActions
        leadId={leadDetail.id}
        phone={leadDetail.phone}
        locationArea={leadDetail.locationArea}
        agents={agents}
        currentUserId={session.user.id}
        canLog={canEdit}
        canScheduleVisit={canScheduleVisit}
      />

      <LeadDetailPanel
        lead={leadDetail}
        agents={agents}
        canEdit={canEdit}
        canAssign={canAssign}
        currentUserId={session.user.id}
      />

      {canViewProperties && (
        <LinkedPropertiesCard
          leadId={leadDetail.id}
          linkedProperties={linkedProperties}
          propertyOptions={propertyOptions}
          canEdit={canEdit}
        />
      )}

      <SiteVisitsCard visits={leadDetail.siteVisits} canManage={canScheduleVisit} />

      {canViewPayments && (
        <PaymentSchedule
          leadId={leadDetail.id}
          pipelineStage={leadDetail.pipelineStage}
          payments={payments}
          linkedProperties={linkedProperties.map((p) => ({ id: p.id, title: p.title, price: p.price }))}
          canCreate={canCreatePayments}
          canMarkPaid={canMarkPaid}
          canDelete={canDeletePayments}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline activities={leadDetail.activities} />
        </CardContent>
      </Card>
    </div>
  );
}
