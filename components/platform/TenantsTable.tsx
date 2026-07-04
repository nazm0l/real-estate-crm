"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TenantRow = {
  id: string;
  companyName: string;
  createdAt: string;
  _count: { users: number; leads: number; properties: number; payments: number };
};

export function TenantsTable({
  tenants,
  currentTenantId,
}: {
  tenants: TenantRow[];
  currentTenantId: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [entering, setEntering] = useState<TenantRow | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter((t) => t.companyName.toLowerCase().includes(q));
  }, [tenants, search]);

  async function handleEnter() {
    if (!entering) return;
    setBusy(true);
    const res = await fetch(`/api/platform/tenants/${entering.id}/enter`, { method: "POST" });
    setBusy(false);

    if (!res.ok) {
      toast.error("Could not enter this workspace");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="relative w-72">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search companies"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Properties</TableHead>
                <TableHead>Payments</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No companies match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {t.companyName}
                        {t.id === currentTenantId && (
                          <Badge variant="outline" className="text-xs">
                            yours
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{t._count.users}</TableCell>
                    <TableCell>{t._count.leads}</TableCell>
                    <TableCell>{t._count.properties}</TableCell>
                    <TableCell>{t._count.payments}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(t.createdAt).toLocaleDateString("en-BD", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setEntering(t)}>
                        Manage workspace
                        <ArrowRight className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!entering} onOpenChange={(open) => !open && setEntering(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage {entering?.companyName}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You&apos;ll see and be able to edit this company&apos;s leads, properties, payments,
            team, and settings exactly as their Company Admin would. A banner will stay visible
            while you&apos;re acting on their behalf.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntering(null)}>
              Cancel
            </Button>
            <Button onClick={handleEnter} disabled={busy}>
              {busy ? "Entering…" : "Enter workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
