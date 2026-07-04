import { prisma } from "@/lib/db";

export type MonthBucket = { month: string; label: string };

export type ReportSummary = {
  totalLeads: number;
  bookedLeads: number;
  conversionRate: number; // 0–100
  leadsPerMonth: { month: string; leads: number }[];
  leadsBySource: { source: string; count: number }[];
  agentPerformance: {
    agentId: string;
    name: string;
    assigned: number;
    booked: number;
    conversion: number; // 0–100
  }[];
  collectionPerMonth: { month: string; collected: number; due: number }[];
};

function lastNMonths(n: number): MonthBucket[] {
  const now = new Date();
  const buckets: MonthBucket[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en", { month: "short" }),
    });
  }
  return buckets;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function getReportSummary(tenantId: string, monthCount = 6): Promise<ReportSummary> {
  const months = lastNMonths(monthCount);
  const rangeStart = new Date();
  rangeStart.setMonth(rangeStart.getMonth() - (monthCount - 1));
  rangeStart.setDate(1);
  rangeStart.setHours(0, 0, 0, 0);

  const [leads, payments, users] = await Promise.all([
    prisma.lead.findMany({
      where: { tenantId },
      select: { id: true, source: true, pipelineStage: true, agentId: true, createdAt: true },
    }),
    prisma.payment.findMany({
      where: {
        tenantId,
        OR: [{ dueDate: { gte: rangeStart } }, { paidDate: { gte: rangeStart } }],
      },
      select: { amount: true, dueDate: true, paidDate: true, status: true },
    }),
    prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    }),
  ]);

  const totalLeads = leads.length;
  const bookedLeads = leads.filter((l) => l.pipelineStage === "BOOKED").length;

  // Leads per month (last 6 months)
  const leadsPerMonth = months.map((m) => ({
    month: m.label,
    leads: leads.filter((l) => monthKey(l.createdAt) === m.month).length,
  }));

  // Leads by source
  const sourceCounts = new Map<string, number>();
  for (const l of leads) {
    sourceCounts.set(l.source, (sourceCounts.get(l.source) ?? 0) + 1);
  }
  const leadsBySource = [...sourceCounts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  // Agent performance
  const userName = new Map(users.map((u) => [u.id, u.name]));
  const agentStats = new Map<string, { assigned: number; booked: number }>();
  for (const l of leads) {
    if (!l.agentId) continue;
    const stats = agentStats.get(l.agentId) ?? { assigned: 0, booked: 0 };
    stats.assigned++;
    if (l.pipelineStage === "BOOKED") stats.booked++;
    agentStats.set(l.agentId, stats);
  }
  const agentPerformance = [...agentStats.entries()]
    .map(([agentId, s]) => ({
      agentId,
      name: userName.get(agentId) ?? "Unknown",
      assigned: s.assigned,
      booked: s.booked,
      conversion: s.assigned ? Math.round((s.booked / s.assigned) * 100) : 0,
    }))
    .sort((a, b) => b.booked - a.booked || b.assigned - a.assigned);

  // Payment collection per month: collected = PAID by paidDate, due = all by dueDate
  const collectionPerMonth = months.map((m) => {
    let collected = 0;
    let due = 0;
    for (const p of payments) {
      if (p.paidDate && p.status === "PAID" && monthKey(p.paidDate) === m.month) {
        collected += p.amount;
      }
      if (monthKey(p.dueDate) === m.month) {
        due += p.amount;
      }
    }
    return { month: m.label, collected, due };
  });

  return {
    totalLeads,
    bookedLeads,
    conversionRate: totalLeads ? Math.round((bookedLeads / totalLeads) * 100) : 0,
    leadsPerMonth,
    leadsBySource,
    agentPerformance,
    collectionPerMonth,
  };
}
