import type { LeadSource, PropertyType, PipelineStage, AiScore, SiteVisitStatus } from "@prisma/client";

export type LeadWithAgent = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: LeadSource;
  propertyType: PropertyType | null;
  budgetMin: number | null;
  budgetMax: number | null;
  locationArea: string | null;
  pipelineStage: PipelineStage;
  nextFollowUpAt: string | null;
  aiScore: AiScore | null;
  agentId: string | null;
  agent: { id: string; name: string } | null;
};

export type LeadActivityWithAuthor = {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  createdBy: { id: string; name: string };
};

export type LeadSiteVisit = {
  id: string;
  scheduledAt: string;
  location: string;
  status: SiteVisitStatus;
  note: string | null;
};

export type LeadDetail = LeadWithAgent & {
  activities: LeadActivityWithAuthor[];
  siteVisits: LeadSiteVisit[];
};
