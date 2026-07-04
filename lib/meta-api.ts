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
  paging?: { next?: string }
  error?: { message: string }
}

// Meta paginates at 25 per page by default — without following `paging.next`,
// any account with more than one page of campaigns silently loses the rest.
async function fetchAllPages<T>(url: string): Promise<T[]> {
  const results: T[] = []
  let next: string | undefined = url

  while (next) {
    const res: Response = await fetch(next, { next: { revalidate: 0 } })
    if (!res.ok) break
    const json: MetaApiResponse<T> = await res.json()
    if (json.error || !Array.isArray(json.data)) break
    results.push(...json.data)
    next = json.paging?.next
  }

  return results
}

export async function fetchMetaCampaigns(
  accessToken: string,
  adAccountId: string
): Promise<MetaCampaignData[]> {
  if (!accessToken || !adAccountId) return []

  const fields =
    "id,name,insights.date_preset(maximum){spend,impressions,clicks,actions},insights.date_preset(today).as(insights_today){spend}"
  const url = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=${encodeURIComponent(fields)}&limit=100&access_token=${accessToken}`

  const campaigns = await fetchAllPages<MetaCampaign>(url)

  return campaigns.map((campaign): MetaCampaignData => {
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

// The ad set's optimization_goal is what Meta's UI actually keys "Results" off of —
// it's more specific than the campaign's broad objective (e.g. objective can say
// OUTCOME_TRAFFIC while the ad set is really optimizing for CONVERSATIONS/messages).
// Checked first; the objective-based map above is only a fallback when it's absent.
const OPTIMIZATION_GOAL_RESULT_ACTIONS: Record<string, string[]> = {
  LEAD_GENERATION: ["lead", "onsite_conversion.lead_grouped"],
  QUALITY_LEAD: ["lead", "onsite_conversion.lead_grouped"],
  CONVERSATIONS: [
    "onsite_conversion.total_messaging_connection",
    "onsite_conversion.messaging_conversation_started_7d",
  ],
  LINK_CLICKS: ["link_click"],
  LANDING_PAGE_VIEWS: ["landing_page_view"],
  POST_ENGAGEMENT: ["post_engagement"],
  PAGE_LIKES: ["like"],
  OFFSITE_CONVERSIONS: ["offsite_conversion.fb_pixel_purchase"],
  APP_INSTALLS: ["mobile_app_install"],
  APP_INSTALLS_AND_OFFSITE_CONVERSIONS: ["mobile_app_install"],
}

// The result LABEL is a fixed property of the campaign (its optimization goal never
// changes day to day) — only the count should vary by date range. Picking the label
// from "whichever action type happens to be present this period" caused a campaign
// optimizing for messaging conversations to flip to "Link clicks" on a quiet day.
function resolveResultLabel(
  objective: string | undefined,
  optimizationGoal: string | undefined
): { actionTypes: string[]; label: string } | { impressions: true } {
  if (optimizationGoal === "IMPRESSIONS" || optimizationGoal === "REACH") {
    return { impressions: true }
  }
  if (objective && AWARENESS_OBJECTIVES.has(objective)) {
    return { impressions: true }
  }

  const actionTypes =
    (optimizationGoal && OPTIMIZATION_GOAL_RESULT_ACTIONS[optimizationGoal]) ||
    (objective && OBJECTIVE_RESULT_ACTIONS[objective]) ||
    ["link_click"]

  return { actionTypes, label: RESULT_LABELS[actionTypes[0]] ?? actionTypes[0] }
}

function resolveResult(
  objective: string | undefined,
  optimizationGoal: string | undefined,
  impressions: number,
  actions: Array<{ action_type: string; value: string }>
): { resultType: string; resultCount: number } {
  const resolved = resolveResultLabel(objective, optimizationGoal)
  if ("impressions" in resolved) {
    return { resultType: "Impressions", resultCount: impressions }
  }

  // Use whichever candidate action type Meta reported this period; if none fired
  // (a quiet day), the count is legitimately 0 — the label itself never changes.
  for (const actionType of resolved.actionTypes) {
    const found = actions.find((a) => a.action_type === actionType)
    if (found) {
      return { resultType: resolved.label, resultCount: Math.round(parseFloat(found.value) || 0) }
    }
  }
  return { resultType: resolved.label, resultCount: 0 }
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
  adsets?: { data: Array<{ optimization_goal?: string }> }
}

// Meta never flips effective_status away from ACTIVE just because a campaign's
// schedule ended — it stays "ACTIVE" administratively for months. What Ads
// Manager's "Delivery" column actually shows also checks the end date against now.
export function isDeliveryActive(status: string, endDate: string | null): boolean {
  if (status !== "ACTIVE") return false
  if (!endDate) return true
  return new Date(endDate).getTime() > Date.now()
}

export type DailyTrendPoint = { date: string; spend: number; clicks: number }

type MetaCampaignWithDailyInsights = {
  id: string
  effective_status?: string
  stop_time?: string
  insights?: { data: Array<{ date_start?: string; spend?: string; clicks?: string }> }
}

// Aggregates day-by-day spend/clicks across every campaign matching the status
// filter — powers the trend line above the per-campaign comparison chart.
export async function fetchDailyTrend(
  accessToken: string,
  adAccountId: string,
  range: DateRange,
  activeOnly: boolean
): Promise<DailyTrendPoint[]> {
  if (!accessToken || !adAccountId) return []

  const preset = DATE_PRESET_BY_RANGE[range]
  const fields = `id,effective_status,stop_time,insights.time_increment(1).date_preset(${preset}){spend,clicks,date_start}`
  const url = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=${encodeURIComponent(fields)}&limit=100&access_token=${accessToken}`

  const campaigns = await fetchAllPages<MetaCampaignWithDailyInsights>(url)

  const relevant = activeOnly
    ? campaigns.filter((c) => isDeliveryActive(c.effective_status ?? "UNKNOWN", c.stop_time ?? null))
    : campaigns

  const byDate = new Map<string, { spend: number; clicks: number }>()
  for (const campaign of relevant) {
    for (const row of campaign.insights?.data ?? []) {
      const date = row.date_start
      if (!date) continue
      const entry = byDate.get(date) ?? { spend: 0, clicks: 0 }
      entry.spend += parseFloat(row.spend ?? "0") || 0
      entry.clicks += parseInt(row.clicks ?? "0", 10) || 0
      byDate.set(date, entry)
    }
  }

  return [...byDate.entries()]
    .map(([date, v]) => ({ date, spend: Math.round(v.spend * 100) / 100, clicks: v.clicks }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function fetchCampaignInsights(
  accessToken: string,
  adAccountId: string,
  range: DateRange
): Promise<MetaCampaignInsight[]> {
  if (!accessToken || !adAccountId) return []

  const preset = DATE_PRESET_BY_RANGE[range]
  const fields =
    `id,name,effective_status,objective,stop_time,adsets.limit(3){optimization_goal},insights.date_preset(${preset}){spend,impressions,clicks,actions}`
  const url = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=${encodeURIComponent(fields)}&limit=100&access_token=${accessToken}`

  const campaigns = await fetchAllPages<MetaCampaignWithMeta>(url)

  return campaigns.map((campaign): MetaCampaignInsight => {
    const insight: MetaInsight = campaign.insights?.data?.[0] ?? {}
    const spend = parseFloat(insight.spend ?? "0") || 0
    const impressions = parseInt(insight.impressions ?? "0", 10) || 0
    const optimizationGoal = campaign.adsets?.data?.[0]?.optimization_goal
    const { resultType, resultCount } = resolveResult(
      campaign.objective,
      optimizationGoal,
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
