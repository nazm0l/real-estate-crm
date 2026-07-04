"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Building2, Link2, Unlink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatBDT } from "@/lib/format-bdt";
import { PROPERTY_STATUS_BADGE } from "@/components/properties/constants";
import type { PropertyStatus } from "@prisma/client";

export type LinkedProperty = {
  id: string;
  title: string;
  price: number;
  status: PropertyStatus;
  locationArea: string;
};

export function LinkedPropertiesCard({
  leadId,
  linkedProperties,
  propertyOptions,
  canEdit,
}: {
  leadId: string;
  linkedProperties: LinkedProperty[];
  propertyOptions: { id: string; title: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const linkedIds = new Set(linkedProperties.map((p) => p.id));
  const availableOptions = propertyOptions.filter((p) => !linkedIds.has(p.id));

  async function handleLink() {
    if (!selectedId) return;
    setBusy(true);
    const res = await fetch(`/api/leads/${leadId}/properties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: selectedId }),
    });
    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(typeof data?.error === "string" ? data.error : "Could not link this property");
      return;
    }
    toast.success("Property linked");
    setSelectedId(null);
    setLinkOpen(false);
    router.refresh();
  }

  async function handleUnlink(propertyId: string) {
    setBusy(true);
    const res = await fetch(`/api/leads/${leadId}/properties`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId }),
    });
    setBusy(false);

    if (!res.ok) {
      toast.error("Could not unlink this property");
      return;
    }
    toast.success("Property unlinked");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-7 items-center justify-center rounded-md bg-accent text-primary">
            <Building2 className="size-4" />
          </span>
          Interested in
        </CardTitle>
        {canEdit && availableOptions.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setLinkOpen(true)}>
            <Link2 className="h-4 w-4" />
            Link property
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {linkedProperties.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No properties linked yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {linkedProperties.map((property) => (
              <li key={property.id} className="flex items-center gap-2 py-2">
                <Link
                  href={`/properties/${property.id}`}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{property.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBDT(property.price)} · {property.locationArea}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("text-xs", PROPERTY_STATUS_BADGE[property.status])}>
                    {property.status}
                  </Badge>
                </Link>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Unlink"
                    disabled={busy}
                    onClick={() => handleUnlink(property.id)}
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link a property</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Property</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {availableOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLink} disabled={busy || !selectedId}>
              {busy ? "Linking…" : "Link property"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
