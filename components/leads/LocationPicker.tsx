"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
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
        <Combobox
          value={group}
          onChange={(v) => {
            setGroup(v);
            setArea(null);
            setSubArea(null);
          }}
          options={BD_AREAS.map((g) => ({ value: g.label, label: g.label }))}
          placeholder="Select region"
          searchPlaceholder="Search region…"
        />
      </div>

      <div className="space-y-2">
        <Label>Area</Label>
        <Combobox
          value={area}
          onChange={(v) => {
            setArea(v);
            setSubArea(null);
          }}
          options={areas.map((a) => ({ value: a.name, label: a.name }))}
          placeholder="Select area"
          searchPlaceholder="Search area…"
          disabled={!group}
        />
      </div>

      <div className="space-y-2">
        <Label>Sub-area</Label>
        <Combobox
          value={subArea}
          onChange={setSubArea}
          options={subAreas.map((s) => ({ value: s, label: s }))}
          placeholder={subAreas.length ? "Select sub-area" : "—"}
          searchPlaceholder="Search sub-area…"
          disabled={!subAreas.length}
        />
      </div>
    </div>
  );
}
