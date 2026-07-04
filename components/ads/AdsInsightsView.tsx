"use client"

import { useEffect, useState } from "react"
import { Megaphone } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { CampaignTable, type CampaignRow } from "./CampaignTable"
import { SpendLeadsChart } from "./SpendLeadsChart"

const RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "lifetime", label: "Lifetime" },
]

export function AdsInsightsView() {
  const [range, setRange] = useState("today")
  const [status, setStatus] = useState<"active" | "all">("active")
  const [campaigns, setCampaigns] = useState<CampaignRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErrored(false)

    fetch(`/api/meta-ads/insights?range=${range}&status=${status}`)
      .then((res) => {
        if (!res.ok) throw new Error("request failed")
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setCampaigns(data.campaigns ?? [])
      })
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

  return (
    <div className="space-y-4">
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
          <SpendLeadsChart campaigns={campaigns} />
          <CampaignTable campaigns={campaigns} />
        </>
      )}
    </div>
  )
}
