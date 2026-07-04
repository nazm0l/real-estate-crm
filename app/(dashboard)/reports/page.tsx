import { redirect } from "next/navigation";
import { BarChart3, TrendingUp, Users, CheckCircle2 } from "lucide-react";
import { getSession } from "@/lib/session";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getReportSummary } from "@/lib/reports";
import { LeadsPerMonthChart } from "@/components/reports/LeadsPerMonthChart";
import { SourcePieChart } from "@/components/reports/SourcePieChart";
import { CollectionChart } from "@/components/reports/CollectionChart";
import { AgentPerformanceTable } from "@/components/reports/AgentPerformanceTable";
import { ExportLeadsButton } from "@/components/reports/ExportLeadsButton";
import { PeriodSelect } from "@/components/reports/PeriodSelect";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { months: monthsParam } = await searchParams;
  const months = ["3", "6", "12"].includes(monthsParam ?? "") ? Number(monthsParam) : 6;

  const canView = await hasPermission(session.user.roleId, PERMISSIONS.REPORTS_VIEW);
  if (!canView) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <BarChart3 className="size-12 opacity-40" />
        <p className="font-medium">Access denied</p>
        <p className="text-sm">You don&apos;t have permission to view reports.</p>
      </div>
    );
  }

  const [canExport, summary] = await Promise.all([
    hasPermission(session.user.roleId, PERMISSIONS.LEADS_EXPORT),
    getReportSummary(session.user.tenantId, months),
  ]);

  const statCards = [
    { label: "Total leads", value: summary.totalLeads, icon: Users },
    { label: "Booked", value: summary.bookedLeads, icon: CheckCircle2 },
    { label: "Conversion rate", value: `${summary.conversionRate}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Performance over the last {months} months
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelect months={months} />
          {canExport && <ExportLeadsButton />}
        </div>
      </div>

      {summary.totalLeads === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 py-20 text-center">
          <BarChart3 className="size-12 text-muted-foreground opacity-50" />
          <div>
            <p className="font-medium text-foreground">No data to report yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add some leads and the numbers will show up here.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {statCards.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <p className="mt-1 text-2xl font-semibold">{s.value}</p>
                  </div>
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <s.icon className="size-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <LeadsPerMonthChart data={summary.leadsPerMonth} />
            <SourcePieChart data={summary.leadsBySource} />
          </div>

          <CollectionChart data={summary.collectionPerMonth} />
          <AgentPerformanceTable agents={summary.agentPerformance} />
        </>
      )}
    </div>
  );
}
