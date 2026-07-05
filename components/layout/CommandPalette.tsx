"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Building2 } from "lucide-react";
import type { PipelineStage, PropertyStatus } from "@prisma/client";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { displayBDPhone } from "@/lib/bd-phone";
import { STAGE_BADGE } from "@/components/leads/constants";
import { NAV_ITEMS, isNavItemVisible } from "@/components/layout/nav-items";
import type { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type SearchResults = {
  leads: { id: string; name: string; phone: string; pipelineStage: PipelineStage }[];
  properties: { id: string; title: string; locationArea: string; status: PropertyStatus }[];
};

const EMPTY: SearchResults = { leads: [], properties: [] };

export function CommandPalette({
  open,
  onOpenChange,
  permissions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissions: Permission[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) setResults(await res.json());
      } catch {
        // network hiccup — keep previous results
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const go = useCallback(
    (href: string) => {
      onOpenChange(false);
      setQuery("");
      router.push(href);
    },
    [onOpenChange, router]
  );

  const allowedNavItems = NAV_ITEMS.filter((item) => isNavItemVisible(item, permissions));
  const navMatches = query.trim()
    ? allowedNavItems.filter((n) => n.label.toLowerCase().includes(query.trim().toLowerCase()))
    : allowedNavItems;

  const hasResults = results.leads.length > 0 || results.properties.length > 0 || navMatches.length > 0;

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setQuery("");
      }}
      title="Search"
      description="Search leads, properties, and pages"
    >
      <Command shouldFilter={false}>
      <CommandInput
        placeholder="Search leads, properties, pages…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!hasResults && (
          <CommandEmpty>{loading ? "Searching…" : "No results found."}</CommandEmpty>
        )}

        {results.leads.length > 0 && (
          <CommandGroup heading="Leads">
            {results.leads.map((lead) => (
              <CommandItem key={lead.id} value={`lead-${lead.id}`} onSelect={() => go(`/leads/${lead.id}`)}>
                <User className="size-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{lead.name}</span>
                <span className="text-xs text-muted-foreground">{displayBDPhone(lead.phone)}</span>
                <Badge variant="outline" className={cn("text-[10px]", STAGE_BADGE[lead.pipelineStage])}>
                  {lead.pipelineStage}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.properties.length > 0 && (
          <>
            {results.leads.length > 0 && <CommandSeparator />}
            <CommandGroup heading="Properties">
              {results.properties.map((p) => (
                <CommandItem key={p.id} value={`property-${p.id}`} onSelect={() => go(`/properties/${p.id}`)}>
                  <Building2 className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  <span className="text-xs text-muted-foreground">{p.locationArea}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {navMatches.length > 0 && (
          <>
            {(results.leads.length > 0 || results.properties.length > 0) && <CommandSeparator />}
            <CommandGroup heading="Pages">
              {navMatches.map((item) => (
                <CommandItem key={item.href} value={`nav-${item.href}`} onSelect={() => go(item.href)}>
                  <item.icon className="size-4 text-muted-foreground" />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
      </Command>
    </CommandDialog>
  );
}
