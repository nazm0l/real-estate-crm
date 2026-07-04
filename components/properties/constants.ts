import type { PropertyStatus, PropertyType } from "@prisma/client";

export const PROPERTY_STATUS_BADGE: Record<PropertyStatus, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  BOOKED: "bg-amber-50 text-amber-700 border-amber-200",
  SOLD: "bg-slate-100 text-slate-600 border-slate-200",
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APARTMENT: "Apartment",
  LAND: "Land",
  COMMERCIAL: "Commercial",
};
