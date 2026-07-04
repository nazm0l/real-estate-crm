"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

const chartConfig: ChartConfig = {
  leads: { label: "Leads", color: "hsl(var(--primary))" },
};

export function LeadsPerMonthChart({ data }: { data: { month: string; leads: number }[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="mb-4 text-sm font-medium text-foreground">Leads per month</p>
      <ChartContainer config={chartConfig} className="h-[220px] w-full">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid vertical={false} className="stroke-border" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
                  <p className="font-medium">{label}</p>
                  <p className="text-muted-foreground">{payload[0].value} leads</p>
                </div>
              );
            }}
          />
          <Bar dataKey="leads" fill={chartConfig.leads.color as string} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
