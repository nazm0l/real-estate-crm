"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseBDTInput } from "@/lib/parse-bdt";
import { PropertyCard } from "./PropertyCard";
import { PropertyForm } from "./PropertyForm";
import { PROPERTY_TYPE_LABELS } from "./constants";
import type { PropertyListItem } from "./types";
import type { PropertyType, PropertyStatus } from "@prisma/client";

const TYPES = Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[];
const STATUSES: PropertyStatus[] = ["AVAILABLE", "BOOKED", "SOLD"];

export function PropertiesView({
  initialProperties,
  canCreate,
}: {
  initialProperties: PropertyListItem[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [minPriceText, setMinPriceText] = useState("");
  const [maxPriceText, setMaxPriceText] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const minPrice = minPriceText.trim() ? parseBDTInput(minPriceText) : null;
    const maxPrice = maxPriceText.trim() ? parseBDTInput(maxPriceText) : null;

    return initialProperties.filter((p) => {
      if (q) {
        const haystack = `${p.title} ${p.projectName ?? ""} ${p.locationArea}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (minPrice != null && p.price < minPrice) return false;
      if (maxPrice != null && p.price > maxPrice) return false;
      return true;
    });
  }, [initialProperties, search, typeFilter, statusFilter, minPriceText, maxPriceText]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Properties</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {initialProperties.length} properties
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Add property
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search title, project, location"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {PROPERTY_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Min price"
          value={minPriceText}
          onChange={(e) => setMinPriceText(e.target.value)}
          className="w-28"
        />
        <Input
          placeholder="Max price"
          value={maxPriceText}
          onChange={(e) => setMaxPriceText(e.target.value)}
          className="w-28"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <Building2 className="size-12 text-muted-foreground/50" />
          <p className="font-medium">No properties found</p>
          <p className="text-sm text-muted-foreground">
            {initialProperties.length === 0
              ? "Add your first property to get started."
              : "Try adjusting your filters."}
          </p>
          {canCreate && initialProperties.length === 0 && (
            <Button className="mt-2" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Add property
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}

      {canCreate && (
        <PropertyForm
          mode="create"
          open={formOpen}
          onOpenChange={setFormOpen}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
