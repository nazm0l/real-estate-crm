"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, MapPin, Pencil, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBDT } from "@/lib/format-bdt";
import { displayBDPhone } from "@/lib/bd-phone";
import { STAGE_BADGE } from "@/components/leads/constants";
import { PROPERTY_STATUS_BADGE, PROPERTY_TYPE_LABELS } from "./constants";
import { PropertyForm, type PropertyFormValues } from "./PropertyForm";
import type { PropertyLinkedLead } from "./types";

export function PropertyDetailView({
  property,
  linkedLeads,
  canEdit,
  canViewLeads,
}: {
  property: PropertyFormValues;
  linkedLeads: PropertyLinkedLead[];
  canEdit: boolean;
  canViewLeads: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [mainPhoto, setMainPhoto] = useState(property.photoUrls[0] ?? null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            {property.title}
            <Badge variant="outline" className={cn("text-xs", PROPERTY_STATUS_BADGE[property.status])}>
              {property.status}
            </Badge>
          </h1>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {property.locationArea}
            {property.projectName && ` · ${property.projectName}`}
          </p>
        </div>
        {canEdit && (
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted">
            {mainPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary R2 hostnames aren't configured for next/image
              <img src={mainPhoto} alt={property.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Building2 className="size-14" />
              </div>
            )}
          </div>
          {property.photoUrls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {property.photoUrls.map((url) => (
                <button
                  key={url}
                  onClick={() => setMainPhoto(url)}
                  className={cn(
                    "size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                    mainPhoto === url ? "border-primary" : "border-transparent"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary R2 hostnames aren't configured for next/image */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Price" value={formatBDT(property.price)} highlight />
            <Field label="Type" value={PROPERTY_TYPE_LABELS[property.type]} />
            <Field
              label="Size"
              value={property.sizeSqft ? `${property.sizeSqft.toLocaleString("en-BD")} sqft` : "—"}
            />
            <Field label="Floor" value={property.floor != null ? String(property.floor) : "—"} />
            <Field label="Bedrooms" value={property.bedrooms ? String(property.bedrooms) : "—"} />
            <Field label="Project" value={property.projectName ?? "—"} />
            {property.description && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm whitespace-pre-wrap">{property.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {canViewLeads && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-7 items-center justify-center rounded-md bg-accent text-primary">
                <Users className="size-4" />
              </span>
              Interested leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {linkedLeads.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No leads linked to this property yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {linkedLeads.map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{displayBDPhone(lead.phone)}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-xs", STAGE_BADGE[lead.pipelineStage])}>
                        {lead.pipelineStage}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {canEdit && (
        <PropertyForm
          mode="edit"
          property={property}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-medium", highlight && "text-lg font-bold text-primary")}>{value}</p>
    </div>
  );
}
