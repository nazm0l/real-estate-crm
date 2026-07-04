"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatBDT } from "@/lib/format-bdt"

type Campaign = {
  campaignId: string
  name: string
  spend: number
  resultCount: number
}

const chartConfig: ChartConfig = {
  spend: {
    label: "Spend",
    color: "hsl(var(--primary))",
  },
  resultCount: {
    label: "Results",
    color: "hsl(var(--info))",
  },
}

function truncate(s: string, max = 20) {
  return s.length > max ? s.slice(0, max) + "…" : s
}

export function SpendLeadsChart({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) return null

  const data = campaigns.map((c) => ({
    name: truncate(c.name),
    spend: Math.round(c.spend),
    resultCount: c.resultCount,
  }))

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-medium mb-4 text-foreground">
        Spend vs Results
      </p>
      <ChartContainer config={chartConfig} className="h-[260px] w-full">
        <BarChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid vertical={false} className="stroke-border" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            yAxisId="spend"
            orientation="left"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) =>
              v >= 100_000 ? `৳${(v / 100_000).toFixed(1)}L` : `৳${v}`
            }
          />
          <YAxis
            yAxisId="results"
            orientation="right"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => String(v)}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const spend = payload.find((p) => p.dataKey === "spend")
              const results = payload.find((p) => p.dataKey === "resultCount")
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-sm">
                  <p className="font-medium mb-1">{label}</p>
                  {spend && (
                    <p style={{ color: chartConfig.spend.color }}>
                      Spend: {formatBDT(Number(spend.value))}
                    </p>
                  )}
                  {results && (
                    <p style={{ color: chartConfig.resultCount.color }}>
                      Results: {results.value}
                    </p>
                  )}
                </div>
              )
            }}
          />
          <Bar
            yAxisId="spend"
            dataKey="spend"
            fill={chartConfig.spend.color as string}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="results"
            dataKey="resultCount"
            fill={chartConfig.resultCount.color as string}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
