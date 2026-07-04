import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/db"
import { hasPermission, PERMISSIONS } from "@/lib/permissions"
import { AdsInsightsView } from "@/components/ads/AdsInsightsView"
import { SyncButton } from "@/components/ads/SyncButton"
import { AdInsightCard } from "@/components/ai/AdInsightCard"
import { Megaphone, RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { getLanguage } from "@/lib/language"

export default async function AdsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const canView = await hasPermission(session.user.roleId, PERMISSIONS.ADS_VIEW)
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <Megaphone className="w-12 h-12 opacity-40" />
        <p className="font-medium">Access denied</p>
        <p className="text-sm">You don&apos;t have permission to view ads.</p>
      </div>
    )
  }

  const [canSync, lang] = await Promise.all([
    hasPermission(session.user.roleId, PERMISSIONS.ADS_SYNC),
    getLanguage(),
  ])

  const [campaigns, tenant] = await Promise.all([
    prisma.metaAdCampaign.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { spendBdt: "desc" },
    }),
    prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { metaAccessToken: true, metaAdAccountId: true },
    }),
  ])

  const hasCreds = !!(
    (tenant?.metaAccessToken || process.env.META_ACCESS_TOKEN) &&
    (tenant?.metaAdAccountId || process.env.META_AD_ACCOUNT_ID)
  )

  const lastSync = campaigns[0]?.syncedAt ?? null
  const lastSyncText = lastSync
    ? formatDistanceToNow(new Date(lastSync), { addSuffix: true })
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meta Ads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {lastSyncText ? `Last synced ${lastSyncText}` : "No data synced yet"}
          </p>
        </div>
        {canSync && <SyncButton />}
      </div>

      {campaigns.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-20 gap-4 text-center">
          <Megaphone className="w-12 h-12 text-muted-foreground opacity-50" />
          <div>
            <p className="font-medium text-foreground">No ad data yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasCreds ? (
                "Your Meta account is connected — run a sync to pull campaign data."
              ) : (
                <>
                  Connect your Meta ad account in{" "}
                  <Link href="/settings/workspace" className="text-primary hover:underline">
                    Settings → Workspace
                  </Link>
                  , then sync.
                </>
              )}
            </p>
          </div>
          {canSync && hasCreds && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4" />
              Use the Sync button above to pull campaign data.
            </div>
          )}
        </div>
      ) : (
        <>
          <AdInsightCard lang={lang} />
          <AdsInsightsView />
        </>
      )}
    </div>
  )
}
