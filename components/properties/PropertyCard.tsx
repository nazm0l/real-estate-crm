"use client";

import { useRouter } from "next/navigation";
import { Building2, MapPin, BedDouble, Ruler, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatBDT } from "@/lib/format-bdt";
import { PROPERTY_STATUS_BADGE, PROPERTY_TYPE_LABELS } from "./constants";
import type { PropertyListItem } from "./types";

export function PropertyCard({ property }: { property: PropertyListItem }) {
  const router = useRouter();

  return (
    <Card
      className="cursor-pointer gap-0 overflow-hidden py-0 transition-all hover:-translate-y-0.5 hover:shadow-md"
      onClick={() => router.push(`/properties/${property.id}`)}
    >
      <div className="relative aspect-[16/9] bg-muted">
        {property.photoUrls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary R2 hostnames aren't configured for next/image
          <img
            src={property.photoUrls[0]}
            alt={property.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Building2 className="size-10" />
          </div>
        )}
        <Badge
          variant="outline"
          className={cn("absolute top-2 right-2 bg-opacity-100 text-xs", PROPERTY_STATUS_BADGE[property.status])}
        >
          {property.status}
        </Badge>
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold">{property.title}</p>
          <Badge variant="outline" className="shrink-0 text-xs">
            {PROPERTY_TYPE_LABELS[property.type]}
          </Badge>
        </div>
        <p className="text-lg font-bold text-primary">{formatBDT(property.price)}</p>
        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          {property.locationArea}
          {property.projectName && ` · ${property.projectName}`}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {property.sizeSqft && (
            <span className="flex items-center gap-1">
              <Ruler className="size-3" />
              {property.sizeSqft.toLocaleString("en-BD")} sqft
            </span>
          )}
          {property.bedrooms && (
            <span className="flex items-center gap-1">
              <BedDouble className="size-3" />
              {property.bedrooms} beds
            </span>
          )}
          {property._count.leads > 0 && (
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {property._count.leads} lead{property._count.leads > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
