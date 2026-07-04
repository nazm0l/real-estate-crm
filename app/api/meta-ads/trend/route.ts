import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/require-permission"
import { PERMISSIONS } from "@/lib/permissions"
import { fetchDailyTrend, resolveMetaCreds, DATE_RANGES, type DateRange } from "@/lib/meta-api"

export async function GET(req: Request) {
  const { error, session } = await requirePermission(PERMISSIONS.ADS_VIEW)
  if (error) return error

  const url = new URL(req.url)
  const rangeParam = url.searchParams.get("range") ?? "7d"
  const statusParam = url.searchParams.get("status") ?? "active"
  const range: DateRange = (DATE_RANGES as readonly string[]).includes(rangeParam)
    ? (rangeParam as DateRange)
    : "7d"

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { metaAccessToken: true, metaAdAccountId: true },
  })
  if (!tenant) return new Response("Not found", { status: 404 })

  const creds = resolveMetaCreds(tenant)
  if (!creds) return NextResponse.json({ points: [] })

  const points = await fetchDailyTrend(creds.token, creds.account, range, statusParam !== "all")
  return NextResponse.json({ points })
}
