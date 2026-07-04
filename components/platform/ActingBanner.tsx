"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ActingBanner({ companyName }: { companyName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleExit() {
    setBusy(true);
    await fetch("/api/platform/exit", { method: "POST" });
    setBusy(false);
    router.push("/platform");
    router.refresh();
  }

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <span className="flex items-center gap-2">
        <ShieldAlert className="size-4" />
        Platform Admin — Managing <strong>{companyName}</strong>
      </span>
      <Button
        variant="outline"
        size="sm"
        className="h-7 border-amber-950/30 bg-transparent text-amber-950 hover:bg-amber-950/10"
        onClick={handleExit}
        disabled={busy}
      >
        {busy ? "Exiting…" : "Exit"}
      </Button>
    </div>
  );
}
