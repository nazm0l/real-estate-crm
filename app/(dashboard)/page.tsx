import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { formatBDT } from "@/lib/format-bdt";
import { formatUSD } from "@/lib/format-usd";
import { startOfToday } from "@/lib/payment-status";
import { addDays, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/StatCard";
import { OverdueFollowUpsWidget } from "@/components/dashboard/OverdueFollowUpsWidget";
import { TodaysVisitsWidget } from "@/components/dashboard/TodaysVisitsWidget";
import { HotLeadsWidget } from "@/components/dashboard/HotLeadsWidget";
import { PipelineSnapshotWidget } from "@/components/dashboard/PipelineSnapshotWidget";
import {
  Users,
  Building2,
  Wallet,
  CalendarCheck,
  AlertCircle,
  HandCoins,
  Megaphone,
} from "lucide-react";

export default async function DashboardHome() {
  const session = await getSession();
  if (!session) return null;

  const [canViewLeads, canViewPayments, canViewVisits, canViewAds] = await Promise.all([
    hasPermission(session.user.roleId, PERMISSIONS.LEADS_VIEW),
    hasPermission(session.user.roleId, PERMISSIONS.PAYMENTS_VIEW),
    hasPermission(session.user.roleId, PERMISSIONS.VISITS_VIEW),
    hasPermission(session.user.roleId, PERMISSIONS.ADS_VIEW),
  ]);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const todayStart = startOfToday();

  const [totalLeads, newThisWeek, overdueCount] = canViewLeads
    ? await Promise.all([
        prisma.lead.count({ where: { tenantId: session.user.tenantId } }),
        prisma.lead.count({
          where: { tenantId: session.user.tenantId, createdAt: { gte: weekAgo } },
        }),
        prisma.lead.count({
          // MongoDB matches null on lt filters — exclude explicitly
          where: { tenantId: session.user.tenantId, nextFollowUpAt: { lt: now, not: null } },
        }),
      ])
    : [null, null, null];

  const [overduePayments, collectedThisMonth, collectedLastMonth] = canViewPayments
    ? await Promise.all([
        prisma.payment.aggregate({
          where: {
            tenantId: session.user.tenantId,
            status: "PENDING",
            dueDate: { lt: todayStart },
          },
          _count: true,
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: { tenantId: session.user.tenantId, status: "PAID", paidDate: { gte: monthStart } },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: {
            tenantId: session.user.tenantId,
            status: "PAID",
            paidDate: { gte: lastMonthStart, lt: monthStart },
          },
          _sum: { amount: true },
        }),
      ])
    : [null, null, null];

  const [todaysVisitCount, nextVisit] = canViewVisits
    ? await Promise.all([
        prisma.siteVisit.count({
          where: {
            tenantId: session.user.tenantId,
            scheduledAt: { gte: todayStart, lt: addDays(todayStart, 1) },
          },
        }),
        prisma.siteVisit.findFirst({
          where: {
            tenantId: session.user.tenantId,
            status: "SCHEDULED",
            scheduledAt: { gte: now, lt: addDays(todayStart, 1) },
          },
          orderBy: { scheduledAt: "asc" },
          select: { scheduledAt: true },
        }),
      ])
    : [null, null];

  const adSpend = canViewAds
    ? await prisma.metaAdCampaign.aggregate({
        where: { tenantId: session.user.tenantId },
        _sum: { spendTodayBdt: true },
        _max: { syncedAt: true },
      })
    : null;

  const overdueAmount = overduePayments?._sum.amount ?? 0;
  const collected = collectedThisMonth?._sum.amount ?? 0;
  const collectedPrev = collectedLastMonth?._sum.amount ?? 0;
  const collectedSubtext =
    collectedPrev > 0
      ? `${collected >= collectedPrev ? "+" : ""}${Math.round(((collected - collectedPrev) / collectedPrev) * 100)}% vs last month`
      : collected > 0
        ? "First collections this month"
        : "Nothing collected yet";

  const visitsSubtext =
    todaysVisitCount === null
      ? "No access"
      : nextVisit
        ? `Next at ${new Date(nextVisit.scheduledAt).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}`
        : todaysVisitCount > 0
          ? "All done for today"
          : "No visits today";

  const adSpendSubtext = adSpend
    ? adSpend._max.syncedAt
      ? `Synced ${formatDistanceToNow(adSpend._max.syncedAt, { addSuffix: true })}`
      : "Not synced yet"
    : "No access";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {session.user.name}</h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening in your workspace.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          label="Total leads"
          value={totalLeads !== null ? String(totalLeads) : "—"}
          subtext={totalLeads === null ? "No access" : `+${newThisWeek} new this week`}
          icon={Users}
          href={canViewLeads ? "/leads" : undefined}
        />
        <StatCard
          label="Overdue follow-ups"
          value={overdueCount !== null ? String(overdueCount) : "—"}
          subtext={overdueCount === null ? "No access" : overdueCount ? "Needs attention" : "All caught up"}
          icon={AlertCircle}
          tone={overdueCount ? "destructive" : "primary"}
          href={canViewLeads ? "/leads" : undefined}
        />
        <StatCard
          label="Overdue payments"
          value={overduePayments ? formatBDT(overdueAmount) : "—"}
          subtext={
            overduePayments
              ? overduePayments._count
                ? `${overduePayments._count} payment${overduePayments._count > 1 ? "s" : ""} past due`
                : "All caught up"
              : "No access"
          }
          icon={Wallet}
          tone={overduePayments && overduePayments._count ? "destructive" : "primary"}
          href={canViewPayments ? "/payments" : undefined}
        />
        <StatCard
          label="Collected this month"
          value={collectedThisMonth ? formatBDT(collected) : "—"}
          subtext={collectedThisMonth ? collectedSubtext : "No access"}
          icon={HandCoins}
          href={canViewPayments ? "/payments" : undefined}
        />
        <StatCard
          label="Today's site visits"
          value={todaysVisitCount !== null ? String(todaysVisitCount) : "—"}
          subtext={visitsSubtext}
          icon={CalendarCheck}
          href={canViewVisits ? "/visits" : undefined}
        />
        <StatCard
          label="Ad spend today"
          value={adSpend ? formatUSD(adSpend._sum.spendTodayBdt ?? 0) : "—"}
          subtext={adSpendSubtext}
          icon={Megaphone}
          href={canViewAds ? "/ads" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {canViewLeads && <OverdueFollowUpsWidget tenantId={session.user.tenantId} />}
        {canViewVisits && <TodaysVisitsWidget tenantId={session.user.tenantId} />}
        {canViewLeads && <HotLeadsWidget tenantId={session.user.tenantId} />}
        {canViewLeads && <PipelineSnapshotWidget tenantId={session.user.tenantId} />}
      </div>

      {!totalLeads && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-7 items-center justify-center rounded-md bg-accent text-primary">
                <Building2 className="size-4" />
              </span>
              Getting started
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Your workspace is set up. Invite your team and configure roles from{" "}
            <span className="font-medium text-foreground">Settings</span>, add your first lead from
            the <span className="font-medium text-foreground">Leads</span> page, and press{" "}
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
              Ctrl K
            </kbd>{" "}
            to search anywhere.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
