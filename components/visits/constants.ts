import type { SiteVisitStatus } from "@prisma/client";

export const VISIT_STATUS_BADGE: Record<SiteVisitStatus, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-teal-50 text-teal-700 border-teal-200",
  CANCELLED: "bg-slate-100 text-slate-600 border-slate-200",
  NO_SHOW: "bg-red-50 text-red-600 border-red-200",
};

export const VISIT_STATUS_LABELS: Record<SiteVisitStatus, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};
