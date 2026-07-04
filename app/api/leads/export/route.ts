import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { prisma } from "@/lib/db";
import { displayBDPhone } from "@/lib/bd-phone";

function csvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const { error, session } = await requirePermission(PERMISSIONS.LEADS_EXPORT);
  if (error) return error;

  const leads = await prisma.lead.findMany({
    where: { tenantId: session.user.tenantId },
    include: { agent: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "Name",
    "Phone",
    "Email",
    "Source",
    "Property Type",
    "Budget Min (BDT)",
    "Budget Max (BDT)",
    "Location",
    "Stage",
    "AI Score",
    "Agent",
    "Next Follow-up",
    "Created At",
  ];

  const rows = leads.map((l) =>
    [
      l.name,
      displayBDPhone(l.phone),
      l.email,
      l.source,
      l.propertyType,
      l.budgetMin,
      l.budgetMax,
      l.locationArea,
      l.pipelineStage,
      l.aiScore,
      l.agent?.name,
      l.nextFollowUpAt?.toISOString().slice(0, 10),
      l.createdAt.toISOString().slice(0, 10),
    ]
      .map(csvCell)
      .join(",")
  );

  // BOM so Excel renders Bangla (UTF-8) correctly
  const csv = "﻿" + [header.join(","), ...rows].join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${date}.csv"`,
    },
  });
}
