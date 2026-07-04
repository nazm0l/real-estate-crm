"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatUSD } from "@/lib/format-usd"

type Campaign = {
  campaignId: string
  name: string
  spend: number
  resultCount: number
}

const SPEND_COLOR_FROM = "#818cf8" // indigo-400
const SPEND_COLOR_TO = "#4f46e5" // indigo-600
const RESULT_COLOR_FROM = "#5eead4" // teal-300
const RESULT_COLOR_TO = "#0d9488" // teal-600

const chartConfig: ChartConfig = {
  spend: {
    label: "Spend",
    color: SPEND_COLOR_TO,
  },
  resultCount: {
    label: "Results",
    color: RESULT_COLOR_TO,
  },
}

function truncate(s: string, max = 20) {
  return s.length > max ? s.slice(0, max) + "…" : s
}

export function SpendLeadsChart({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) return null

  const data = campaigns.map((c) => ({
    name: truncate(c.name),
    spend: Math.round(c.spend * 100) / 100,
    resultCount: c.resultCount,
  }))

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-medium mb-4 text-foreground">
        Spend vs Results
      </p>
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <BarChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }} barCategoryGap="28%">
          <defs>
            <linearGradient id="adsSpendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SPEND_COLOR_FROM} />
              <stop offset="100%" stopColor={SPEND_COLOR_TO} />
            </linearGradient>
            <linearGradient id="adsResultGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={RESULT_COLOR_FROM} />
              <stop offset="100%" stopColor={RESULT_COLOR_TO} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
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
            tick={{ fontSize: 11, fill: SPEND_COLOR_TO }}
            tickFormatter={(v: number) => `$${v}`}
          />
          <YAxis
            yAxisId="results"
            orientation="right"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: RESULT_COLOR_TO }}
            tickFormatter={(v: number) => String(v)}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const spend = payload.find((p) => p.dataKey === "spend")
              const results = payload.find((p) => p.dataKey === "resultCount")
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg text-sm">
                  <p className="font-medium mb-1.5">{label}</p>
                  {spend && (
                    <p className="flex items-center gap-1.5" style={{ color: SPEND_COLOR_TO }}>
                      <span
                        className="inline-block size-2 rounded-full"
                        style={{ backgroundColor: SPEND_COLOR_TO }}
                      />
                      Spend: {formatUSD(Number(spend.value))}
                    </p>
                  )}
                  {results && (
                    <p className="flex items-center gap-1.5" style={{ color: RESULT_COLOR_TO }}>
                      <span
                        className="inline-block size-2 rounded-full"
                        style={{ backgroundColor: RESULT_COLOR_TO }}
                      />
                      Results: {results.value}
                    </p>
                  )}
                </div>
              )
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => (value === "spend" ? "Spend" : "Results")}
          />
          <Bar
            yAxisId="spend"
            dataKey="spend"
            name="spend"
            fill="url(#adsSpendGradient)"
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
          />
          <Bar
            yAxisId="results"
            dataKey="resultCount"
            name="resultCount"
            fill="url(#adsResultGradient)"
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
