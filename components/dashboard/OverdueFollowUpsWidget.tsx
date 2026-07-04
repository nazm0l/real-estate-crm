import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { displayBDPhone } from "@/lib/bd-phone";
import { AlertCircle, ArrowRight } from "lucide-react";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function daysOverdue(date: Date) {
  return Math.max(1, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

export async function OverdueFollowUpsWidget({ tenantId }: { tenantId: string }) {
  const leads = await prisma.lead.findMany({
    // MongoDB matches null on lt filters — exclude explicitly
    where: { tenantId, nextFollowUpAt: { lt: new Date(), not: null } },
    orderBy: { nextFollowUpAt: "asc" },
    take: 5,
    select: { id: true, name: true, phone: true, nextFollowUpAt: true },
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-7 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <AlertCircle className="size-4" />
          </span>
          Overdue follow-ups
        </CardTitle>
        <Link
          href="/leads"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No overdue follow-ups. Nice work.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-xs font-semibold text-destructive">
                    {initials(lead.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{lead.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {displayBDPhone(lead.phone)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    {daysOverdue(lead.nextFollowUpAt!)}d overdue
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
