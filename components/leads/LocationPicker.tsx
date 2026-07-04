"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BD_AREAS } from "@/lib/dhaka-locations";

function findLocationPath(value: string | null) {
  if (!value) return null;
  for (const group of BD_AREAS) {
    for (const area of group.areas) {
      if (area.name === value) return { group: group.label, area: area.name, subArea: null as string | null };
      const subArea = area.subAreas?.find((s) => s === value);
      if (subArea) return { group: group.label, area: area.name, subArea };
    }
  }
  return null;
}

export function LocationPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const initial = findLocationPath(value);
  const [group, setGroup] = useState<string | null>(initial?.group ?? null);
  const [area, setArea] = useState<string | null>(initial?.area ?? null);
  const [subArea, setSubArea] = useState<string | null>(initial?.subArea ?? null);

  const areas = BD_AREAS.find((g) => g.label === group)?.areas ?? [];
  const subAreas = areas.find((a) => a.name === area)?.subAreas ?? [];

  useEffect(() => {
    onChange(subArea ?? area ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, subArea]);

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <div className="space-y-2">
        <Label>Region</Label>
        <Select
          value={group}
          onValueChange={(v) => {
            setGroup(v);
            setArea(null);
            setSubArea(null);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select region" />
          </SelectTrigger>
          <SelectContent>
            {BD_AREAS.map((g) => (
              <SelectItem key={g.label} value={g.label}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Area</Label>
        <Select
          value={area}
          onValueChange={(v) => {
            setArea(v);
            setSubArea(null);
          }}
          disabled={!group}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select area" />
          </SelectTrigger>
          <SelectContent>
            {areas.map((a) => (
              <SelectItem key={a.name} value={a.name}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Sub-area</Label>
        <Select value={subArea} onValueChange={setSubArea} disabled={!subAreas.length}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={subAreas.length ? "Select sub-area" : "—"} />
          </SelectTrigger>
          <SelectContent>
            {subAreas.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
