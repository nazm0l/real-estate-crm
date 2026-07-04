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

type MetaApiResponse<T> = {
  data: T[]
  error?: { message: string }
}

export async function fetchMetaCampaigns(
  accessToken: string,
  adAccountId: string
): Promise<MetaCampaignData[]> {
  if (!accessToken || !adAccountId) return []

  const fields =
    "id,name,insights.date_preset(maximum){spend,impressions,clicks,actions},insights.date_preset(today).as(insights_today){spend}"
  const url = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=${encodeURIComponent(fields)}&access_token=${accessToken}`

  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) return []

  const json: MetaApiResponse<MetaCampaign> = await res.json()
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

// Tenant creds win; global env creds are the fallback for deployments still on a single account
export function resolveMetaCreds(tenant: {
  metaAccessToken: string | null
  metaAdAccountId: string | null
}): { token: string; account: string } | null {
  const token = tenant.metaAccessToken || process.env.META_ACCESS_TOKEN || ""
  const account = tenant.metaAdAccountId || process.env.META_AD_ACCOUNT_ID || ""
  if (!token || !account) return null
  return { token, account }
}

// ── Live, date-range-filterable campaign insights (powers the /ads detail table) ──

export const DATE_RANGES = ["today", "yesterday", "7d", "30d", "lifetime"] as const
export type DateRange = (typeof DATE_RANGES)[number]

const DATE_PRESET_BY_RANGE: Record<DateRange, string> = {
  today: "today",
  yesterday: "yesterday",
  "7d": "last_7d",
  "30d": "last_30d",
  lifetime: "maximum",
}

// Meta's own "Results" column depends on the campaign objective — approximate it by
// picking the first matching action_type present for that objective, in priority order.
const OBJECTIVE_RESULT_ACTIONS: Record<string, string[]> = {
  OUTCOME_LEADS: ["lead", "onsite_conversion.lead_grouped"],
  LEAD_GENERATION: ["lead", "onsite_conversion.lead_grouped"],
  OUTCOME_ENGAGEMENT: [
    "onsite_conversion.total_messaging_connection",
    "onsite_conversion.messaging_conversation_started_7d",
    "post_engagement",
    "page_engagement",
  ],
  MESSAGES: [
    "onsite_conversion.total_messaging_connection",
    "onsite_conversion.messaging_conversation_started_7d",
  ],
  POST_ENGAGEMENT: ["post_engagement"],
  ENGAGEMENT: ["post_engagement", "page_engagement"],
  OUTCOME_TRAFFIC: ["link_click"],
  LINK_CLICKS: ["link_click"],
  OUTCOME_SALES: ["purchase", "offsite_conversion.fb_pixel_purchase"],
  CONVERSIONS: ["offsite_conversion.fb_pixel_purchase", "purchase"],
  OUTCOME_APP_PROMOTION: ["mobile_app_install"],
  APP_INSTALLS: ["mobile_app_install"],
}

const RESULT_LABELS: Record<string, string> = {
  lead: "Leads",
  "onsite_conversion.lead_grouped": "Leads",
  "onsite_conversion.total_messaging_connection": "Messaging conversations",
  "onsite_conversion.messaging_conversation_started_7d": "Messaging conversations",
  post_engagement: "Post engagements",
  page_engagement: "Page engagements",
  link_click: "Link clicks",
  purchase: "Purchases",
  "offsite_conversion.fb_pixel_purchase": "Purchases",
  mobile_app_install: "App installs",
}

const AWARENESS_OBJECTIVES = new Set([
  "OUTCOME_AWARENESS",
  "BRAND_AWARENESS",
  "REACH",
])

function resolveResult(
  objective: string | undefined,
  impressions: number,
  actions: Array<{ action_type: string; value: string }>
): { resultType: string; resultCount: number } {
  if (objective && AWARENESS_OBJECTIVES.has(objective)) {
    return { resultType: "Impressions", resultCount: impressions }
  }

  const candidates = (objective && OBJECTIVE_RESULT_ACTIONS[objective]) || ["link_click"]
  for (const actionType of candidates) {
    const found = actions.find((a) => a.action_type === actionType)
    if (found) {
      return {
        resultType: RESULT_LABELS[actionType] ?? actionType,
        resultCount: Math.round(parseFloat(found.value) || 0),
      }
    }
  }

  // Nothing matched — fall back to link clicks if present, otherwise report zero actions
  const fallback = actions.find((a) => a.action_type === "link_click")
  if (fallback) {
    return { resultType: "Link clicks", resultCount: Math.round(parseFloat(fallback.value) || 0) }
  }
  return { resultType: "Actions", resultCount: 0 }
}

export type MetaCampaignInsight = {
  campaignId: string
  name: string
  status: string
  endDate: string | null
  spend: number
  impressions: number
  resultType: string
  resultCount: number
}

type MetaCampaignWithMeta = {
  id: string
  name: string
  effective_status?: string
  objective?: string
  stop_time?: string
  insights?: { data: MetaInsight[] }
}

export async function fetchCampaignInsights(
  accessToken: string,
  adAccountId: string,
  range: DateRange
): Promise<MetaCampaignInsight[]> {
  if (!accessToken || !adAccountId) return []

  const preset = DATE_PRESET_BY_RANGE[range]
  const fields =
    `id,name,effective_status,objective,stop_time,insights.date_preset(${preset}){spend,impressions,clicks,actions}`
  const url = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=${encodeURIComponent(fields)}&access_token=${accessToken}`

  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) return []

  const json: MetaApiResponse<MetaCampaignWithMeta> = await res.json()
  if (json.error || !Array.isArray(json.data)) return []

  return json.data.map((campaign): MetaCampaignInsight => {
    const insight: MetaInsight = campaign.insights?.data?.[0] ?? {}
    const spend = parseFloat(insight.spend ?? "0") || 0
    const impressions = parseInt(insight.impressions ?? "0", 10) || 0
    const { resultType, resultCount } = resolveResult(
      campaign.objective,
      impressions,
      insight.actions ?? []
    )

    return {
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.effective_status ?? "UNKNOWN",
      endDate: campaign.stop_time ?? null,
      spend,
      impressions,
      resultType,
      resultCount,
    }
  })
}
