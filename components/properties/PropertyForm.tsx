"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBDT } from "@/lib/format-bdt";
import { parseBDTInput } from "@/lib/parse-bdt";
import { LocationPicker } from "@/components/leads/LocationPicker";
import { ImageUploader } from "./ImageUploader";
import { PROPERTY_TYPE_LABELS } from "./constants";
import type { PropertyType, PropertyStatus } from "@prisma/client";

const TYPES = Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[];
const STATUSES: PropertyStatus[] = ["AVAILABLE", "BOOKED", "SOLD"];

export type PropertyFormValues = {
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
};

export function PropertyForm({
  mode,
  property,
  open,
  onOpenChange,
  onSaved,
}: {
  mode: "create" | "edit";
  property?: PropertyFormValues;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<PropertyType>("APARTMENT");
  const [priceText, setPriceText] = useState("");
  const [sizeSqft, setSizeSqft] = useState("");
  const [floor, setFloor] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [locationArea, setLocationArea] = useState<string | null>(null);
  const [status, setStatus] = useState<PropertyStatus>("AVAILABLE");
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(property?.title ?? "");
    setType(property?.type ?? "APARTMENT");
    setPriceText(property?.price ? String(property.price) : "");
    setSizeSqft(property?.sizeSqft ? String(property.sizeSqft) : "");
    setFloor(property?.floor != null ? String(property.floor) : "");
    setBedrooms(property?.bedrooms ? String(property.bedrooms) : "");
    setLocationArea(property?.locationArea ?? null);
    setStatus(property?.status ?? "AVAILABLE");
    setProjectName(property?.projectName ?? "");
    setDescription(property?.description ?? "");
    setPhotoUrls(property?.photoUrls ?? []);
  }, [open, property]);

  const parsedPrice = priceText.trim() ? parseBDTInput(priceText) : null;

  async function handleSubmit() {
    if (parsedPrice == null) {
      toast.error("Enter a valid price, e.g. 1.2 crore");
      return;
    }
    if (!locationArea) {
      toast.error("Select a location");
      return;
    }

    setSaving(true);
    const payload = {
      title,
      type,
      price: parsedPrice,
      sizeSqft: sizeSqft.trim() ? Number(sizeSqft) : mode === "edit" ? null : undefined,
      floor: floor.trim() ? Number(floor) : mode === "edit" ? null : undefined,
      bedrooms: bedrooms.trim() ? Number(bedrooms) : mode === "edit" ? null : undefined,
      locationArea,
      projectName: projectName.trim() ? projectName : mode === "edit" ? null : undefined,
      description: description.trim() ? description : mode === "edit" ? null : undefined,
      photoUrls,
      ...(mode === "edit" ? { status } : {}),
    };

    const res = await fetch(mode === "create" ? "/api/properties" : `/api/properties/${property!.id}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(typeof data?.error === "string" ? data.error : "Could not save this property");
      return;
    }

    toast.success(mode === "create" ? "Property added" : "Property updated");
    onOpenChange(false);
    onSaved();
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-y-auto data-[side=right]:sm:w-[40vw] data-[side=right]:sm:max-w-[40vw]"
      >
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "Add property" : "Edit property"}</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-1 gap-x-4 gap-y-5 px-4 pb-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="property-title" required>Title</Label>
            <Input id="property-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="property-project">Project name</Label>
            <Input
              id="property-project"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as PropertyType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {PROPERTY_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="property-price" required>Price</Label>
            <Input
              id="property-price"
              placeholder="e.g. 1.2 crore"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
            />
            {parsedPrice != null && (
              <p className="text-xs text-muted-foreground">{formatBDT(parsedPrice)}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 sm:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="property-size">Size (sqft)</Label>
              <Input
                id="property-size"
                type="number"
                value={sizeSqft}
                onChange={(e) => setSizeSqft(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="property-floor">Floor</Label>
              <Input
                id="property-floor"
                type="number"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="property-bedrooms">Bedrooms</Label>
              <Input
                id="property-bedrooms"
                type="number"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label required>Location</Label>
            <LocationPicker value={locationArea} onChange={setLocationArea} />
          </div>

          {mode === "edit" && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v as PropertyStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="property-description">Description</Label>
            <Textarea
              id="property-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Photos</Label>
            <ImageUploader value={photoUrls} onChange={setPhotoUrls} />
          </div>
        </div>

        <SheetFooter className="sticky bottom-0 flex-row justify-end border-t border-border bg-popover">
          <Button variant="outline" className="min-w-32" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="min-w-32"
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !priceText.trim() || !locationArea}
          >
            {saving ? "Saving…" : mode === "create" ? "Add property" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
