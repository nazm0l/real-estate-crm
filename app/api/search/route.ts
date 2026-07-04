import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { normalizeBDPhone } from "@/lib/bd-phone";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ leads: [], properties: [] });

  const [canViewLeads, canViewProperties] = await Promise.all([
    hasPermission(session.user.roleId, PERMISSIONS.LEADS_VIEW),
    hasPermission(session.user.roleId, PERMISSIONS.PROPERTIES_VIEW),
  ]);

  const digits = q.replace(/\D/g, "");
  // Full numbers are normalized to the stored 8801XXXXXXXXX form; partials match as-is
  const phoneQuery = digits.length >= 10 ? (normalizeBDPhone(digits) ?? digits) : digits;

  const [leads, properties] = await Promise.all([
    canViewLeads
      ? prisma.lead.findMany({
          where: {
            tenantId: session.user.tenantId,
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              ...(phoneQuery.length >= 3 ? [{ phone: { contains: phoneQuery } }] : []),
            ],
          },
          take: 5,
          select: { id: true, name: true, phone: true, pipelineStage: true },
        })
      : [],
    canViewProperties
      ? prisma.property.findMany({
          where: {
            tenantId: session.user.tenantId,
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { projectName: { contains: q, mode: "insensitive" } },
              { locationArea: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 5,
          select: { id: true, title: true, locationArea: true, status: true },
        })
      : [],
  ]);

  return NextResponse.json({ leads, properties });
}
