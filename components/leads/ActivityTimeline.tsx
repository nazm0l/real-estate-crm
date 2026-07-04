import { Phone, StickyNote, CalendarCheck, ArrowRightLeft, Wallet } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { LeadActivityWithAuthor } from "./types";

const TYPE_ICON: Record<string, typeof Phone> = {
  call: Phone,
  note: StickyNote,
  visit: CalendarCheck,
  stage_change: ArrowRightLeft,
  payment: Wallet,
};

export function ActivityTimeline({ activities }: { activities: LeadActivityWithAuthor[] }) {
  if (activities.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {activities.map((activity) => {
        const Icon = TYPE_ICON[activity.type] ?? StickyNote;
        return (
          <li key={activity.id} className="flex gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{activity.description}</p>
              <p className="text-xs text-muted-foreground">
                {activity.createdBy.name} · {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
