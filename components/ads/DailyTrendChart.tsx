"use client"

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { formatUSD } from "@/lib/format-usd"

type DailyPoint = { date: string; spend: number; clicks: number }

const SPEND_COLOR = "#4f46e5" // indigo-600
const CLICKS_COLOR = "#f59e0b" // amber-500

const chartConfig: ChartConfig = {
  spend: { label: "Spend", color: SPEND_COLOR },
  clicks: { label: "Clicks", color: CLICKS_COLOR },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function DailyTrendChart({ data }: { data: DailyPoint[] }) {
  if (data.length === 0) return null

  const points = data.map((d) => ({
    date: formatDate(d.date),
    spend: d.spend,
    clicks: d.clicks,
  }))

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-medium mb-4 text-foreground">Daily trend</p>
      <ChartContainer config={chartConfig} className="h-[260px] w-full">
        <ComposedChart data={points} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <defs>
            <linearGradient id="adsTrendSpendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SPEND_COLOR} stopOpacity={0.35} />
              <stop offset="100%" stopColor={SPEND_COLOR} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <YAxis
            yAxisId="spend"
            orientation="left"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: SPEND_COLOR }}
            tickFormatter={(v: number) => `$${v}`}
          />
          <YAxis
            yAxisId="clicks"
            orientation="right"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: CLICKS_COLOR }}
          />
          <Tooltip
            cursor={{ stroke: SPEND_COLOR, strokeOpacity: 0.2, strokeWidth: 2 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const spend = payload.find((p) => p.dataKey === "spend")
              const clicks = payload.find((p) => p.dataKey === "clicks")
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg text-sm">
                  <p className="font-medium mb-1.5">{label}</p>
                  {spend && (
                    <p className="flex items-center gap-1.5" style={{ color: SPEND_COLOR }}>
                      <span className="inline-block size-2 rounded-full" style={{ backgroundColor: SPEND_COLOR }} />
                      Spend: {formatUSD(Number(spend.value))}
                    </p>
                  )}
                  {clicks && (
                    <p className="flex items-center gap-1.5" style={{ color: CLICKS_COLOR }}>
                      <span className="inline-block size-2 rounded-full" style={{ backgroundColor: CLICKS_COLOR }} />
                      Clicks: {clicks.value}
                    </p>
                  )}
                </div>
              )
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => (value === "spend" ? "Spend" : "Clicks")}
          />
          <Area
            yAxisId="spend"
            type="monotone"
            dataKey="spend"
            name="spend"
            stroke={SPEND_COLOR}
            strokeWidth={2}
            fill="url(#adsTrendSpendGradient)"
          />
          <Line
            yAxisId="clicks"
            type="monotone"
            dataKey="clicks"
            name="clicks"
            stroke={CLICKS_COLOR}
            strokeWidth={2}
            dot={{ r: 3, fill: CLICKS_COLOR, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  )
}
