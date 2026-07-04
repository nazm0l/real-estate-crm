import Link from "next/link";
import { Kanban, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PIPELINE_STAGES } from "@/components/leads/constants";
import type { PipelineStage } from "@prisma/client";

const STAGE_BAR_COLOR: Record<PipelineStage, string> = {
  NEW: "bg-slate-400",
  CONTACTED: "bg-blue-400",
  INTERESTED: "bg-violet-400",
  SITE_VISIT: "bg-amber-400",
  NEGOTIATION: "bg-orange-400",
  BOOKED: "bg-teal-500",
  LOST: "bg-red-400",
};

export async function PipelineSnapshotWidget({ tenantId }: { tenantId: string }) {
  const grouped = await prisma.lead.groupBy({
    by: ["pipelineStage"],
    where: { tenantId },
    _count: true,
  });

  const counts = new Map(grouped.map((g) => [g.pipelineStage, g._count]));
  const stages = PIPELINE_STAGES.map((s) => ({
    ...s,
    count: counts.get(s.value) ?? 0,
  }));
  const total = stages.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-7 items-center justify-center rounded-md bg-accent text-primary">
            <Kanban className="size-4" />
          </span>
          Pipeline snapshot
        </CardTitle>
        <Link
          href="/leads"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Open board
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No leads in the pipeline yet.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              {stages
                .filter((s) => s.count > 0)
                .map((s) => (
                  <div
                    key={s.value}
                    className={STAGE_BAR_COLOR[s.value]}
                    style={{ width: `${(s.count / total) * 100}%` }}
                    title={`${s.label}: ${s.count}`}
                  />
                ))}
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
              {stages.map((s) => (
                <li key={s.value} className="flex items-center gap-2 text-xs">
                  <span className={`size-2.5 shrink-0 rounded-full ${STAGE_BAR_COLOR[s.value]}`} />
                  <span className="truncate text-muted-foreground">{s.label}</span>
                  <span className="ml-auto font-medium">{s.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
