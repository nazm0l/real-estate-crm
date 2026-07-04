"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-7" />
      </span>
      <div>
        <p className="text-lg font-semibold">Something went wrong</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {error.digest ? `Error reference: ${error.digest}` : error.message || "An unexpected error occurred."}
        </p>
      </div>
      <Button onClick={reset} variant="outline">
        <RotateCcw className="size-4" />
        Try again
      </Button>
    </div>
  );
}
