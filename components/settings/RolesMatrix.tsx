"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Role = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: { permission: string }[];
  _count: { users: number };
};

const MODULE_LABELS: Record<string, string> = {
  leads: "Leads",
  properties: "Properties",
  payments: "Payments",
  visits: "Site visits",
  ads: "Meta Ads",
  team: "Team",
  roles: "Roles",
  ai: "AI",
  reports: "Reports",
};

function groupPermissions() {
  const groups = new Map<string, Permission[]>();
  for (const permission of Object.values(PERMISSIONS)) {
    const [module] = permission.split(":");
    if (!groups.has(module)) groups.set(module, []);
    groups.get(module)!.push(permission);
  }
  return groups;
}

export function RolesMatrix({ initialRoles }: { initialRoles: Role[] }) {
  const router = useRouter();
  const [roles, setRoles] = useState(initialRoles);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const groups = groupPermissions();

  async function togglePermission(role: Role, permission: Permission, enabled: boolean) {
    if (role.isSystem) return;

    setRoles((prev) =>
      prev.map((r) =>
        r.id === role.id
          ? {
              ...r,
              permissions: enabled
                ? [...r.permissions, { permission }]
                : r.permissions.filter((p) => p.permission !== permission),
            }
          : r
      )
    );

    const res = await fetch(`/api/roles/${role.id}/permissions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permission, enabled }),
    });

    if (!res.ok) {
      toast.error("Could not update permission");
      router.refresh();
    }
  }

  async function handleCreateRole() {
    setCreating(true);
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newRoleName, description: newRoleDescription || undefined }),
    });
    setCreating(false);

    if (!res.ok) {
      toast.error("Could not create role");
      return;
    }

    const role = await res.json();
    setRoles((prev) => [...prev, { ...role, permissions: [], _count: { users: 0 } }]);
    setNewRoleName("");
    setNewRoleDescription("");
    setCreateOpen(false);
    toast.success("Role created");
  }

  async function handleDeleteRole(role: Role) {
    const res = await fetch(`/api/roles/${role.id}`, { method: "DELETE" });
    if (!res.ok) {
      const text = await res.text();
      toast.error(text || "Could not delete role");
      return;
    }
    setRoles((prev) => prev.filter((r) => r.id !== role.id));
    toast.success("Role deleted");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>Create custom role</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-56">Permission</TableHead>
              {roles.map((role) => (
                <TableHead key={role.id} className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span>{role.name}</span>
                    {!role.isSystem && (
                      <button
                        onClick={() => handleDeleteRole(role)}
                        className="text-xs font-normal text-destructive hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from(groups.entries()).map(([module, permissions]) => (
              <Fragment key={module}>
                <TableRow className="bg-muted/40">
                  <TableCell colSpan={roles.length + 1} className="font-medium">
                    {MODULE_LABELS[module] ?? module}
                  </TableCell>
                </TableRow>
                {permissions.map((permission) => (
                  <TableRow key={permission}>
                    <TableCell className="text-sm text-muted-foreground">
                      {permission.split(":")[1].replace(/_/g, " ")}
                    </TableCell>
                    {roles.map((role) => {
                      const enabled =
                        role.isSystem || role.permissions.some((p) => p.permission === permission);
                      return (
                        <TableCell key={role.id} className="text-center">
                          <Switch
                            checked={enabled}
                            disabled={role.isSystem}
                            onCheckedChange={(checked) => togglePermission(role, permission, checked)}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create custom role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-name" required>Name</Label>
              <Input id="role-name" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Input
                id="role-description"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRole} disabled={creating || !newRoleName.trim()}>
              {creating ? "Creating…" : "Create role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
