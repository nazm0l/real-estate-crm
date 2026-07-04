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
  id: string
  name: string
  spendBdt: number
  leadsCount: number
}

const chartConfig: ChartConfig = {
  spendBdt: {
    label: "Spend",
    color: "hsl(var(--primary))",
  },
  leadsCount: {
    label: "Leads",
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
    spendBdt: Math.round(c.spendBdt),
    leadsCount: c.leadsCount,
  }))

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-medium mb-4 text-foreground">
        Spend vs Leads
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
            yAxisId="leads"
            orientation="right"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => String(v)}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const spend = payload.find((p) => p.dataKey === "spendBdt")
              const leads = payload.find((p) => p.dataKey === "leadsCount")
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-sm">
                  <p className="font-medium mb-1">{label}</p>
                  {spend && (
                    <p style={{ color: chartConfig.spendBdt.color }}>
                      Spend: {formatBDT(Number(spend.value))}
                    </p>
                  )}
                  {leads && (
                    <p style={{ color: chartConfig.leadsCount.color }}>
                      Leads: {leads.value}
                    </p>
                  )}
                </div>
              )
            }}
          />
          <Bar
            yAxisId="spend"
            dataKey="spendBdt"
            fill={chartConfig.spendBdt.color as string}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="leads"
            dataKey="leadsCount"
            fill={chartConfig.leadsCount.color as string}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
