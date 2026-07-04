import type { PropertyType, PropertyStatus, PipelineStage } from "@prisma/client";

export type PropertyListItem = {
  id: string;
  title: string;
  type: PropertyType;
  price: number;
  sizeSqft: number | null;
  floor: number | null;
  bedrooms: number | null;
  locationArea: string;
  status: PropertyStatus;
  projectName: string | null;
  description: string | null;
  photoUrls: string[];
  _count: { leads: number };
};

export type PropertyLinkedLead = {
  id: string;
  name: string;
  phone: string;
  pipelineStage: PipelineStage;
};
