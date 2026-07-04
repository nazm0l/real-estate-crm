"use client";

import Link from "next/link";
import { Bell, CheckCircle2, AlertCircle, CalendarCheck, Wallet } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBDT } from "@/lib/format-bdt";
import type { NotificationsPayload } from "@/lib/notifications";

export function NotificationsBell({ notifications }: { notifications: NotificationsPayload }) {
  const { followUps, visits, payments, totalCount } = notifications;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {totalCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {totalCount > 9 ? "9+" : totalCount}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="max-h-[70vh] w-80 overflow-y-auto">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 className="size-8 text-primary opacity-60" />
            <p className="text-sm font-medium">All caught up</p>
            <p className="text-xs text-muted-foreground">No overdue items or visits today.</p>
          </div>
        ) : (
          <>
            {followUps && followUps.count > 0 && (
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertCircle className="size-3.5 text-destructive" />
                  Overdue follow-ups ({followUps.count})
                </DropdownMenuLabel>
                {followUps.items.map((f) => (
                  <DropdownMenuItem
                    key={f.id}
                    render={<Link href={`/leads/${f.id}`} />}
                  >
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className="truncate text-sm">{f.name}</span>
                      <span className="shrink-0 text-xs text-destructive">
                        {formatDistanceToNow(new Date(f.nextFollowUpAt), { addSuffix: true })}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            )}

            {visits && visits.count > 0 && (
              <>
                {followUps && followUps.count > 0 && <DropdownMenuSeparator />}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarCheck className="size-3.5 text-primary" />
                    Today&apos;s visits ({visits.count})
                  </DropdownMenuLabel>
                  {visits.items.map((v) => (
                    <DropdownMenuItem
                      key={v.id}
                      render={<Link href="/visits" />}
                    >
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="truncate text-sm">{v.leadName}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(v.scheduledAt).toLocaleTimeString("en-BD", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}

            {payments && payments.count > 0 && (
              <>
                {((followUps && followUps.count > 0) || (visits && visits.count > 0)) && (
                  <DropdownMenuSeparator />
                )}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Wallet className="size-3.5 text-destructive" />
                    Overdue payments ({payments.count})
                  </DropdownMenuLabel>
                  {payments.items.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      render={<Link href="/payments" />}
                    >
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="truncate text-sm">{p.leadName}</span>
                        <span className="shrink-0 text-xs font-medium text-destructive">
                          {formatBDT(p.amount)}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
