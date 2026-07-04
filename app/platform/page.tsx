import { Building2, Users, UserSquare2, Home, HandCoins, TrendingUp } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { prisma } from "@/lib/db";
import { formatBDT } from "@/lib/format-bdt";
import { StatCard } from "@/components/dashboard/StatCard";
import { TenantsTable } from "@/components/platform/TenantsTable";

export default async function PlatformTenantsPage() {
  const { session } = await requirePlatformAdmin();
  if (!session) return null;

  // session.user.tenantId reflects an entered tenant while acting — look up the
  // admin's real home tenant separately so the "(yours)" badge is always correct.
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });

  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [
    tenants,
    totalTenants,
    totalUsers,
    totalLeads,
    totalProperties,
    collectedAgg,
    newTenantsThisWeek,
  ] = await Promise.all([
    prisma.tenant.findMany({
      select: {
        id: true,
        companyName: true,
        createdAt: true,
        _count: {
          select: { users: true, leads: true, properties: true, payments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.lead.count(),
    prisma.property.count(),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.tenant.count({ where: { createdAt: { gte: weekAgo } } }),
  ]);

  const serialized = tenants.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Platform overview</h1>
        <p className="text-sm text-muted-foreground">
          Aggregate totals across every tenant — no need to enter a workspace to see these.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Tenants"
          value={String(totalTenants)}
          subtext={`+${newTenantsThisWeek} new this week`}
          icon={Building2}
        />
        <StatCard label="Users" value={String(totalUsers)} icon={Users} />
        <StatCard label="Leads" value={String(totalLeads)} icon={UserSquare2} />
        <StatCard label="Properties" value={String(totalProperties)} icon={Home} />
        <StatCard
          label="Collected (all-time)"
          value={formatBDT(collectedAgg._sum.amount ?? 0)}
          icon={HandCoins}
        />
        <StatCard
          label="Growth"
          value={`+${newTenantsThisWeek}`}
          subtext="tenants this week"
          icon={TrendingUp}
        />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Tenants</h2>
        <TenantsTable tenants={serialized} currentTenantId={me?.tenantId ?? ""} />
      </div>
    </div>
  );
}
