import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { PropertyDetailView } from "@/components/properties/PropertyDetailView";
import { BackLink } from "@/components/layout/BackLink";

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await hasPermission(session.user.roleId, PERMISSIONS.PROPERTIES_VIEW))) redirect("/");

  const [property, canEdit, canViewLeads] = await Promise.all([
    prisma.property.findFirst({
      where: { id, tenantId: session.user.tenantId },
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
        leads: {
          select: {
            lead: { select: { id: true, name: true, phone: true, pipelineStage: true } },
          },
        },
      },
    }),
    hasPermission(session.user.roleId, PERMISSIONS.PROPERTIES_EDIT),
    hasPermission(session.user.roleId, PERMISSIONS.LEADS_VIEW),
  ]);
  if (!property) notFound();

  const { leads, ...propertyFields } = property;

  return (
    <div className="space-y-6">
      <BackLink href="/properties" label="Properties" />
      <PropertyDetailView
        property={propertyFields}
        linkedLeads={leads.map((l) => l.lead)}
        canEdit={canEdit}
        canViewLeads={canViewLeads}
      />
    </div>
  );
}
