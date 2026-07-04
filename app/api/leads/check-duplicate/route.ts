import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { normalizeBDPhone } from "@/lib/bd-phone";

export async function GET(req: Request) {
  const { error, session } = await requirePermission(PERMISSIONS.LEADS_VIEW);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  const excludeId = searchParams.get("excludeId") ?? undefined;
  if (!phone) return NextResponse.json({ error: "phone is required" }, { status: 400 });

  const normalized = normalizeBDPhone(phone);
  if (!normalized) return NextResponse.json({ duplicate: false });

  const lead = await prisma.lead.findFirst({
    where: {
      tenantId: session.user.tenantId,
      phone: normalized,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true, name: true, pipelineStage: true },
  });

  return NextResponse.json({ duplicate: !!lead, lead: lead ?? undefined });
}
