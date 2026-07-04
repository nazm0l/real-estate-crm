import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requirePermission } from "@/lib/require-permission"
import { PERMISSIONS } from "@/lib/permissions"
import { fetchCampaignInsights, resolveMetaCreds, DATE_RANGES, type DateRange } from "@/lib/meta-api"

export async function GET(req: Request) {
  const { error, session } = await requirePermission(PERMISSIONS.ADS_VIEW)
  if (error) return error

  const url = new URL(req.url)
  const rangeParam = url.searchParams.get("range") ?? "today"
  const statusParam = url.searchParams.get("status") ?? "active"
  const range: DateRange = (DATE_RANGES as readonly string[]).includes(rangeParam)
    ? (rangeParam as DateRange)
    : "today"

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { metaAccessToken: true, metaAdAccountId: true },
  })
  if (!tenant) return new Response("Not found", { status: 404 })

  const creds = resolveMetaCreds(tenant)
  if (!creds) return NextResponse.json({ skipped: true })

  const campaigns = await fetchCampaignInsights(creds.token, creds.account, range)
  const filtered =
    statusParam === "all" ? campaigns : campaigns.filter((c) => c.status === "ACTIVE")

  filtered.sort((a, b) => b.spend - a.spend)

  return NextResponse.json({ campaigns: filtered })
}
