"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

const SOURCE_COLORS: Record<string, string> = {
  MANUAL: "hsl(215, 15%, 55%)",
  WEBSITE: "hsl(221, 83%, 53%)",
  FACEBOOK: "hsl(239, 84%, 67%)",
  INSTAGRAM: "hsl(330, 81%, 60%)",
  REFERRAL: "hsl(173, 80%, 32%)",
};

const chartConfig: ChartConfig = {
  count: { label: "Leads" },
};

export function SourcePieChart({ data }: { data: { source: string; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="mb-4 text-sm font-medium text-foreground">Leads by source</p>
      <div className="flex items-center gap-6">
        <ChartContainer config={chartConfig} className="h-[180px] w-[180px] shrink-0">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0];
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground">{item.value} leads</p>
                  </div>
                );
              }}
            />
            <Pie
              data={data}
              dataKey="count"
              nameKey="source"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((d) => (
                <Cell key={d.source} fill={SOURCE_COLORS[d.source] ?? "hsl(215, 15%, 70%)"} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <ul className="min-w-0 flex-1 space-y-1.5">
          {data.map((d) => (
            <li key={d.source} className="flex items-center gap-2 text-xs">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: SOURCE_COLORS[d.source] ?? "hsl(215, 15%, 70%)" }}
              />
              <span className="truncate text-muted-foreground">{d.source}</span>
              <span className="ml-auto font-medium">
                {d.count}
                <span className="ml-1 text-muted-foreground font-normal">
                  ({total ? Math.round((d.count / total) * 100) : 0}%)
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
