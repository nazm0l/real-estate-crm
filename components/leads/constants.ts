import type { PipelineStage } from "@prisma/client";
import {
  Sparkles,
  MessageCircle,
  Star,
  MapPinned,
  Handshake,
  PartyPopper,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export const STAGE_BADGE: Record<PipelineStage, string> = {
  NEW: "bg-slate-100 text-slate-700 border-slate-200",
  CONTACTED: "bg-blue-50 text-blue-700 border-blue-200",
  INTERESTED: "bg-violet-50 text-violet-700 border-violet-200",
  SITE_VISIT: "bg-amber-50 text-amber-700 border-amber-200",
  NEGOTIATION: "bg-orange-50 text-orange-700 border-orange-200",
  BOOKED: "bg-teal-50 text-teal-700 border-teal-200",
  LOST: "bg-red-50 text-red-600 border-red-200",
};

export const SCORE_BADGE: Record<"HOT" | "WARM" | "COLD", string> = {
  HOT: "bg-red-50 text-red-600 border-red-200",
  WARM: "bg-amber-50 text-amber-600 border-amber-200",
  COLD: "bg-sky-50 text-sky-600 border-sky-200",
};

export const SOURCE_BADGE: Record<"MANUAL" | "WEBSITE" | "FACEBOOK" | "INSTAGRAM" | "REFERRAL", string> = {
  MANUAL: "bg-slate-100 text-slate-600 border-slate-200",
  WEBSITE: "bg-blue-50 text-blue-600 border-blue-200",
  FACEBOOK: "bg-indigo-50 text-indigo-600 border-indigo-200",
  INSTAGRAM: "bg-pink-50 text-pink-600 border-pink-200",
  REFERRAL: "bg-slate-100 text-slate-600 border-slate-200",
};

// The board skips CONTACTED — the flow goes New -> Interested (or Lost) directly.
// The entry still exists here (and in STAGE_BADGE above) because PipelineStage
// is a fixed Prisma enum; TypeScript requires every key even if unused by the board.
export const PIPELINE_STAGES: { value: PipelineStage; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "INTERESTED", label: "Interested" },
  { value: "SITE_VISIT", label: "Site Visit" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "BOOKED", label: "Booked" },
  { value: "LOST", label: "Lost" },
];

export const STAGE_COLUMN_STYLE: Record<
  PipelineStage,
  { icon: LucideIcon; header: string; iconColor: string; count: string; accent: string }
> = {
  NEW: {
    icon: Sparkles,
    header: "bg-slate-50 border-t-slate-400 dark:bg-slate-950/40",
    iconColor: "text-slate-500",
    count: "bg-slate-100 text-slate-600 dark:bg-slate-900",
    accent: "border-l-slate-400",
  },
  CONTACTED: {
    icon: MessageCircle,
    header: "bg-blue-50 border-t-blue-400 dark:bg-blue-950/40",
    iconColor: "text-blue-500",
    count: "bg-blue-100 text-blue-600 dark:bg-blue-900",
    accent: "border-l-blue-400",
  },
  INTERESTED: {
    icon: Star,
    header: "bg-violet-50 border-t-violet-400 dark:bg-violet-950/40",
    iconColor: "text-violet-500",
    count: "bg-violet-100 text-violet-600 dark:bg-violet-900",
    accent: "border-l-violet-400",
  },
  SITE_VISIT: {
    icon: MapPinned,
    header: "bg-amber-50 border-t-amber-400 dark:bg-amber-950/40",
    iconColor: "text-amber-500",
    count: "bg-amber-100 text-amber-700 dark:bg-amber-900",
    accent: "border-l-amber-400",
  },
  NEGOTIATION: {
    icon: Handshake,
    header: "bg-orange-50 border-t-orange-400 dark:bg-orange-950/40",
    iconColor: "text-orange-500",
    count: "bg-orange-100 text-orange-700 dark:bg-orange-900",
    accent: "border-l-orange-400",
  },
  BOOKED: {
    icon: PartyPopper,
    header: "bg-teal-50 border-t-teal-500 dark:bg-teal-950/40",
    iconColor: "text-teal-600",
    count: "bg-teal-100 text-teal-700 dark:bg-teal-900",
    accent: "border-l-teal-500",
  },
  LOST: {
    icon: XCircle,
    header: "bg-red-50 border-t-red-400 dark:bg-red-950/40",
    iconColor: "text-red-500",
    count: "bg-red-100 text-red-600 dark:bg-red-900",
    accent: "border-l-red-400",
  },
};
