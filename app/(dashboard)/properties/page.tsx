import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { PropertiesView } from "@/components/properties/PropertiesView";

export default async function PropertiesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await hasPermission(session.user.roleId, PERMISSIONS.PROPERTIES_VIEW))) redirect("/");

  const [properties, canCreate] = await Promise.all([
    prisma.property.findMany({
      where: { tenantId: session.user.tenantId },
      select: {
        id: true,
        title: true,
        type: true,
        price: true,
        sizeSqft: true,
        floor: true,
        bedrooms: true,
        locationArea: true,
        status: true,
        projectName: true,
        description: true,
        photoUrls: true,
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    hasPermission(session.user.roleId, PERMISSIONS.PROPERTIES_CREATE),
  ]);

  return <PropertiesView initialProperties={properties} canCreate={canCreate} />;
}
