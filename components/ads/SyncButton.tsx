"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

export function SyncButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSync() {
    setLoading(true)
    try {
      const res = await fetch("/api/meta-ads/sync", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        toast.error("Sync failed")
      } else if (data.skipped) {
        toast.info("Meta API not configured — set META_ACCESS_TOKEN and META_AD_ACCOUNT_ID")
      } else {
        toast.success(`Synced ${data.synced} campaign${data.synced === 1 ? "" : "s"}`)
        router.refresh()
      }
    } catch {
      toast.error("Sync failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleSync} disabled={loading}>
      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
      Sync Now
    </Button>
  )
}
