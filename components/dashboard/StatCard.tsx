import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = "primary",
  href,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  tone?: "primary" | "destructive";
  href?: string;
}) {
  const card = (
    <Card
      className={cn(
        "relative gap-0 p-5 transition-all hover:-translate-y-0.5 hover:shadow-md",
        href && "cursor-pointer"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-xl",
          tone === "destructive" ? "bg-destructive/60" : "bg-primary/60"
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtext && <p className="truncate text-xs text-muted-foreground">{subtext}</p>}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-accent text-primary"
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );

  if (!href) return card;
  return (
    <Link href={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {card}
    </Link>
  );
}
