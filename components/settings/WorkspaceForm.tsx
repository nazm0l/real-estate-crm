"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

export function WorkspaceForm({
  initialCompanyName,
  initialLogoUrl,
  initialMetaAdAccountId,
  hasMetaToken,
}: {
  initialCompanyName: string;
  initialLogoUrl: string | null;
  initialMetaAdAccountId: string | null;
  hasMetaToken: boolean;
}) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [metaAdAccountId, setMetaAdAccountId] = useState(initialMetaAdAccountId ?? "");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, folder: "logos" }),
      });
      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => ({}));
        throw new Error(data?.error ?? "Upload is not available");
      }
      const { uploadUrl, publicUrl } = await presignRes.json();

      await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      setLogoUrl(publicUrl);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload logo");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/settings/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName,
        logoUrl,
        metaAdAccountId,
        // Blank token field = keep the saved one
        ...(metaAccessToken.trim() ? { metaAccessToken } : {}),
      }),
    });
    setSaving(false);

    if (!res.ok) {
      toast.error("Could not save changes");
      return;
    }
    setMetaAccessToken("");
    toast.success("Workspace updated");
    router.refresh();
  }

  return (
    <Card className="max-w-lg">
      <CardContent className="space-y-6 pt-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={logoUrl ?? undefined} alt={companyName} />
            <AvatarFallback className="bg-accent text-accent-foreground text-lg">
              {companyName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <Label htmlFor="logo" className="cursor-pointer text-sm text-primary hover:underline">
              {uploading ? "Uploading…" : "Change logo"}
            </Label>
            <Input
              id="logo"
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={handleLogoChange}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyName">Company name</Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>

        <div className="space-y-4 border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium">Meta Ads integration</p>
            <p className="text-xs text-muted-foreground">
              Connect your company&apos;s Meta ad account to sync campaign data.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="metaAdAccountId">Ad account ID</Label>
            <Input
              id="metaAdAccountId"
              placeholder="act_1234567890"
              value={metaAdAccountId}
              onChange={(e) => setMetaAdAccountId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="metaAccessToken">Access token</Label>
            <Input
              id="metaAccessToken"
              type="password"
              placeholder={hasMetaToken ? "•••••••• (saved — leave blank to keep)" : "Paste your Meta access token"}
              value={metaAccessToken}
              onChange={(e) => setMetaAccessToken(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving || !companyName.trim()}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
