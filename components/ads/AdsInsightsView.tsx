"use client"

import { useEffect, useMemo, useState } from "react"
import { DollarSign, Eye, Megaphone, Target, TrendingUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/dashboard/StatCard"
import { formatUSD } from "@/lib/format-usd"
import { CampaignTable, type CampaignRow } from "./CampaignTable"
import { SpendLeadsChart } from "./SpendLeadsChart"
import { DailyTrendChart } from "./DailyTrendChart"

const RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "lifetime", label: "Lifetime" },
]

type DailyPoint = { date: string; spend: number; clicks: number }

const TREND_SUPPORTED_RANGES = new Set(["7d", "30d", "lifetime"])

export function AdsInsightsView() {
  const [range, setRange] = useState("today")
  const [status, setStatus] = useState<"active" | "all">("active")
  const [campaigns, setCampaigns] = useState<CampaignRow[] | null>(null)
  const [trend, setTrend] = useState<DailyPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErrored(false)

    const requests: Promise<void>[] = [
      fetch(`/api/meta-ads/insights?range=${range}&status=${status}`)
        .then((res) => {
          if (!res.ok) throw new Error("request failed")
          return res.json()
        })
        .then((data) => {
          if (cancelled) return
          setCampaigns(data.campaigns ?? [])
        }),
    ]

    if (TREND_SUPPORTED_RANGES.has(range)) {
      requests.push(
        fetch(`/api/meta-ads/trend?range=${range}&status=${status}`)
          .then((res) => (res.ok ? res.json() : { points: [] }))
          .then((data) => {
            if (!cancelled) setTrend(data.points ?? [])
          })
      )
    } else {
      setTrend([])
    }

    Promise.all(requests)
      .catch(() => {
        if (!cancelled) setErrored(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [range, status])

  const summary = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return null
    const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
    const totalResults = campaigns.reduce((s, c) => s + c.resultCount, 0)
    const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0)
    const avgCostPerResult = totalResults > 0 ? totalSpend / totalResults : null
    const resultTypes = new Set(campaigns.map((c) => c.resultType))
    const resultLabel = resultTypes.size === 1 ? [...resultTypes][0] : "Mixed result types"
    return { totalSpend, totalResults, totalImpressions, avgCostPerResult, resultLabel }
  }, [campaigns])

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total spend"
            value={formatUSD(summary.totalSpend)}
            subtext={`Across ${campaigns?.length ?? 0} campaigns`}
            icon={DollarSign}
          />
          <StatCard
            label="Total results"
            value={summary.totalResults.toLocaleString("en-US")}
            subtext={summary.resultLabel}
            icon={Target}
          />
          <StatCard
            label="Impressions"
            value={summary.totalImpressions.toLocaleString("en-US")}
            icon={Eye}
          />
          <StatCard
            label="Avg. cost per result"
            value={summary.avgCostPerResult != null ? formatUSD(summary.avgCostPerResult) : "—"}
            icon={TrendingUp}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={status} onValueChange={(v) => v && setStatus(v as "active" | "all")}>
          <TabsList>
            <TabsTrigger value="active">Active only</TabsTrigger>
            <TabsTrigger value="all">All statuses</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={range} onValueChange={(v) => v && setRange(v)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : errored ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <Megaphone className="size-10 text-muted-foreground/50" />
          <p className="font-medium">Could not load campaign data</p>
          <p className="text-sm text-muted-foreground">Try a different range or sync again.</p>
        </div>
      ) : !campaigns || campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <Megaphone className="size-10 text-muted-foreground/50" />
          <p className="font-medium">
            {status === "active" ? "No active campaigns" : "No campaigns"} in this range
          </p>
          <p className="text-sm text-muted-foreground">
            {status === "active"
              ? "Try \"All statuses\" or a wider date range."
              : "Try a wider date range."}
          </p>
        </div>
      ) : (
        <>
          {TREND_SUPPORTED_RANGES.has(range) ? (
            trend.length > 0 && <DailyTrendChart data={trend} />
          ) : (
            <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              Pick a range of at least 7 days to see the daily trend.
            </p>
          )}
          <SpendLeadsChart campaigns={campaigns} />
          <CampaignTable campaigns={campaigns} />
        </>
      )}
    </div>
  )
}
