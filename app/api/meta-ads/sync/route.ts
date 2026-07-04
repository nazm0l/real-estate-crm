import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { fetchMetaCampaigns, resolveMetaCreds, type MetaCampaignData } from "@/lib/meta-api"
import { getSession } from "@/lib/session"
import { hasPermission, PERMISSIONS } from "@/lib/permissions"

async function upsertCampaigns(tenantId: string, campaigns: MetaCampaignData[]) {
  for (const c of campaigns) {
    await prisma.metaAdCampaign.upsert({
      where: { tenantId_campaignId: { tenantId, campaignId: c.campaignId } },
      update: {
        name: c.name,
        spendBdt: c.spendBdt,
        spendTodayBdt: c.spendTodayBdt,
        impressions: c.impressions,
        clicks: c.clicks,
        leadsCount: c.leadsCount,
        syncedAt: new Date(),
      },
      create: {
        tenantId,
        campaignId: c.campaignId,
        name: c.name,
        spendBdt: c.spendBdt,
        spendTodayBdt: c.spendTodayBdt,
        impressions: c.impressions,
        clicks: c.clicks,
        leadsCount: c.leadsCount,
        syncedAt: new Date(),
      },
    })
  }
  return campaigns.length
}

async function handleSync(req: Request) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // Cron path: sync every tenant with its own credentials
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    const tenants = await prisma.tenant.findMany({
      select: { id: true, metaAccessToken: true, metaAdAccountId: true },
    })

    let synced = 0
    let tenantsSynced = 0
    for (const tenant of tenants) {
      const creds = resolveMetaCreds(tenant)
      if (!creds) continue
      const campaigns = await fetchMetaCampaigns(creds.token, creds.account)
      if (campaigns.length === 0) continue
      synced += await upsertCampaigns(tenant.id, campaigns)
      tenantsSynced++
    }

    if (tenantsSynced === 0) return NextResponse.json({ skipped: true })
    return NextResponse.json({ synced, tenantsSynced })
  }

  // UI path: session with ADS_SYNC syncs only its own tenant
  const session = await getSession()
  if (!session || !(await hasPermission(session.user.roleId, PERMISSIONS.ADS_SYNC))) {
    return new Response("Unauthorized", { status: 401 })
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { id: true, metaAccessToken: true, metaAdAccountId: true },
  })
  if (!tenant) return new Response("Not found", { status: 404 })

  const creds = resolveMetaCreds(tenant)
  if (!creds) return NextResponse.json({ skipped: true })

  const campaigns = await fetchMetaCampaigns(creds.token, creds.account)
  if (campaigns.length === 0) return NextResponse.json({ synced: 0 })

  const synced = await upsertCampaigns(tenant.id, campaigns)
  return NextResponse.json({ synced })
}

export const GET = handleSync // Vercel cron issues GET with Authorization: Bearer CRON_SECRET
export const POST = handleSync // UI SyncButton
