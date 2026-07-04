"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

type Role = { id: string; name: string };
type Member = { id: string; name: string; email: string; role: Role };

export function TeamManager({
  initialMembers,
  roles,
  currentUserId,
}: {
  initialMembers: Member[];
  roles: Role[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(roles.find((r) => r.name === "Agent")?.id ?? roles[0]?.id ?? "");
  const [inviting, setInviting] = useState(false);

  async function handleInvite() {
    setInviting(true);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, roleId }),
    });
    setInviting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(typeof data?.error === "string" ? data.error : "Could not invite this person");
      return;
    }

    const data = await res.json();
    if (data.tempPassword) {
      toast.success(`Invited. Share this temporary password: ${data.tempPassword}`, {
        duration: 15000,
      });
    } else {
      toast.success("Invitation email sent");
    }

    setName("");
    setEmail("");
    setSheetOpen(false);
    router.refresh();
  }

  async function handleRoleChange(memberId: string, newRoleId: string) {
    const res = await fetch(`/api/team/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId: newRoleId }),
    });
    if (!res.ok) {
      toast.error("Could not update role");
      return;
    }
    const updated = await res.json();
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: updated.role } : m)));
    toast.success("Role updated");
  }

  async function handleRemove(memberId: string) {
    const res = await fetch(`/api/team/${memberId}`, { method: "DELETE" });
    if (!res.ok) {
      const text = await res.text();
      toast.error(text || "Could not remove this person");
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    toast.success("Removed from workspace");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setSheetOpen(true)}>Invite team member</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.name}</TableCell>
              <TableCell className="text-muted-foreground">{member.email}</TableCell>
              <TableCell>
                {member.id === currentUserId ? (
                  <Badge variant="outline">{member.role.name}</Badge>
                ) : (
                  <Select
                    value={member.role.id}
                    onValueChange={(value) => value && handleRoleChange(member.id, value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </TableCell>
              <TableCell className="text-right">
                {member.id !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRemove(member.id)}
                  >
                    Remove
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="overflow-y-auto data-[side=right]:sm:w-[40vw] data-[side=right]:sm:max-w-[40vw]"
        >
          <SheetHeader>
            <SheetTitle>Invite team member</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-1 gap-x-4 gap-y-5 px-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="member-name">Name</Label>
              <Input id="member-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Role</Label>
              <Select value={roleId} onValueChange={(value) => value && setRoleId(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="sticky bottom-0 flex-row justify-end border-t border-border bg-popover">
            <Button variant="outline" className="min-w-32" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button
              className="min-w-32"
              onClick={handleInvite}
              disabled={inviting || !name.trim() || !email.trim()}
            >
              {inviting ? "Inviting…" : "Send invite"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
