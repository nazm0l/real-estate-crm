"use client";

import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { formatBDT } from "@/lib/format-bdt";

const chartConfig: ChartConfig = {
  collected: { label: "Collected", color: "hsl(var(--primary))" },
  due: { label: "Due", color: "hsl(38, 92%, 50%)" },
};

export function CollectionChart({
  data,
}: {
  data: { month: string; collected: number; due: number }[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="mb-4 text-sm font-medium text-foreground">Payment collection (collected vs due)</p>
      <ChartContainer config={chartConfig} className="h-[220px] w-full">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} className="stroke-border" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) =>
              v >= 10_000_000
                ? `৳${(v / 10_000_000).toFixed(1)}Cr`
                : v >= 100_000
                  ? `৳${(v / 100_000).toFixed(1)}L`
                  : `৳${v}`
            }
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
                  <p className="mb-1 font-medium">{label}</p>
                  {payload.map((p) => (
                    <p key={String(p.dataKey)} style={{ color: p.color }}>
                      {p.dataKey === "collected" ? "Collected" : "Due"}:{" "}
                      {formatBDT(Number(p.value))}
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="collected" fill={chartConfig.collected.color as string} radius={[4, 4, 0, 0]} />
          <Bar dataKey="due" fill={chartConfig.due.color as string} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
