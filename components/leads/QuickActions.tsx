"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, StickyNote, CalendarPlus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { displayBDPhone, whatsappLink } from "@/lib/bd-phone";
import { LogActivityDialog } from "./LogActivityDialog";
import { ScheduleVisitDialog } from "./ScheduleVisitDialog";

export function QuickActions({
  leadId,
  phone,
  locationArea,
  agents,
  currentUserId,
  canLog,
  canScheduleVisit,
}: {
  leadId: string;
  phone: string;
  locationArea: string | null;
  agents: { id: string; name: string }[];
  currentUserId: string;
  canLog: boolean;
  canScheduleVisit: boolean;
}) {
  const router = useRouter();
  const [activityType, setActivityType] = useState<"call" | "note" | null>(null);
  const [visitOpen, setVisitOpen] = useState(false);

  return (
    <div>
      <div className="hidden flex-wrap gap-2 md:flex">
        {canLog && (
          <Button variant="outline" size="sm" onClick={() => setActivityType("call")}>
            <Phone className="h-4 w-4" />
            Log call
          </Button>
        )}
        {canLog && (
          <Button variant="outline" size="sm" onClick={() => setActivityType("note")}>
            <StickyNote className="h-4 w-4" />
            Add note
          </Button>
        )}
        {canScheduleVisit && (
          <Button variant="outline" size="sm" onClick={() => setVisitOpen(true)}>
            <CalendarPlus className="h-4 w-4" />
            Schedule visit
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href={whatsappLink(phone)} target="_blank" rel="noopener noreferrer" />}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<a href={`tel:${displayBDPhone(phone)}`} />}
        >
          <Phone className="h-4 w-4" />
          Call {displayBDPhone(phone)}
        </Button>
      </div>

      {/* Field agents on mobile: call/WhatsApp always one tap away */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-border bg-background/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pr-20 backdrop-blur md:hidden">
        <Button
          className="flex-1"
          nativeButton={false}
          render={<a href={`tel:${displayBDPhone(phone)}`} />}
        >
          <Phone className="h-4 w-4" />
          Call
        </Button>
        <Button
          variant="outline"
          className="flex-1 border-teal-600/40 text-teal-700 dark:text-teal-400"
          nativeButton={false}
          render={<a href={whatsappLink(phone)} target="_blank" rel="noopener noreferrer" />}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Button>
        {canLog && (
          <Button
            variant="outline"
            size="icon"
            aria-label="Add note"
            onClick={() => setActivityType("note")}
          >
            <StickyNote className="h-4 w-4" />
          </Button>
        )}
        {canScheduleVisit && (
          <Button
            variant="outline"
            size="icon"
            aria-label="Schedule visit"
            onClick={() => setVisitOpen(true)}
          >
            <CalendarPlus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {activityType && (
        <LogActivityDialog
          leadId={leadId}
          type={activityType}
          open={!!activityType}
          onOpenChange={(open) => !open && setActivityType(null)}
          onLogged={() => router.refresh()}
        />
      )}
      <ScheduleVisitDialog
        leadId={leadId}
        defaultLocation={locationArea}
        agents={agents}
        currentUserId={currentUserId}
        open={visitOpen}
        onOpenChange={setVisitOpen}
        onScheduled={() => router.refresh()}
      />
    </div>
  );
}
