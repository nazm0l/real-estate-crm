import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { getReportSummary } from "@/lib/reports";

export async function GET() {
  const { error, session } = await requirePermission(PERMISSIONS.REPORTS_VIEW);
  if (error) return error;

  const summary = await getReportSummary(session.user.tenantId);
  return NextResponse.json(summary);
}
