"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PERIODS = ["3", "6", "12"] as const;

export function PeriodSelect({ months }: { months: number }) {
  const router = useRouter();

  return (
    <Tabs
      value={String(months)}
      onValueChange={(v) => v && router.push(`/reports?months=${v}`)}
    >
      <TabsList>
        {PERIODS.map((p) => (
          <TabsTrigger key={p} value={p}>
            {p}mo
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
