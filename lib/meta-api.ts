export type MetaCampaignData = {
  campaignId: string
  name: string
  spendBdt: number
  spendTodayBdt: number
  impressions: number
  clicks: number
  leadsCount: number
}

type MetaInsight = {
  spend?: string
  impressions?: string
  clicks?: string
  actions?: Array<{ action_type: string; value: string }>
}

type MetaCampaign = {
  id: string
  name: string
  insights?: { data: MetaInsight[] }
  insights_today?: { data: MetaInsight[] }
}

type MetaApiResponse = {
  data: MetaCampaign[]
  error?: { message: string }
}

export async function fetchMetaCampaigns(
  accessToken: string,
  adAccountId: string
): Promise<MetaCampaignData[]> {
  if (!accessToken || !adAccountId) return []

  const fields =
    "id,name,insights.date_preset(lifetime){spend,impressions,clicks,actions},insights.date_preset(today).as(insights_today){spend}"
  const url = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=${encodeURIComponent(fields)}&access_token=${accessToken}`

  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) return []

  const json: MetaApiResponse = await res.json()
  if (json.error || !Array.isArray(json.data)) return []

  return json.data.map((campaign): MetaCampaignData => {
    const insight: MetaInsight = campaign.insights?.data?.[0] ?? {}
    const todayInsight: MetaInsight = campaign.insights_today?.data?.[0] ?? {}
    const spend = parseFloat(insight.spend ?? "0") || 0
    const spendToday = parseFloat(todayInsight.spend ?? "0") || 0
    const impressions = parseInt(insight.impressions ?? "0", 10) || 0
    const clicks = parseInt(insight.clicks ?? "0", 10) || 0
    const leadsCount = (insight.actions ?? [])
      .filter((a) => a.action_type === "lead")
      .reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0)

    return {
      campaignId: campaign.id,
      name: campaign.name,
      spendBdt: spend,
      spendTodayBdt: spendToday,
      impressions,
      clicks,
      leadsCount: Math.round(leadsCount),
    }
  })
}
