import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { prisma } from "@/lib/db";
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

  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      companyName: true,
      createdAt: true,
      _count: {
        select: { users: true, leads: true, properties: true, payments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = tenants.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <p className="text-sm text-muted-foreground">
          {tenants.length} companies using the platform
        </p>
      </div>
      <TenantsTable tenants={serialized} currentTenantId={me?.tenantId ?? ""} />
    </div>
  );
}
