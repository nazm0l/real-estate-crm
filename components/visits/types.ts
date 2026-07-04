import type { SiteVisitStatus } from "@prisma/client";

export type VisitListItem = {
  id: string;
  scheduledAt: string;
  location: string;
  status: SiteVisitStatus;
  note: string | null;
  lead: { id: string; name: string; phone: string };
  agent: { id: string; name: string };
};
