"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Language } from "@/lib/language"

const SCORE_BADGE: Record<string, string> = {
  HOT: "bg-red-50 text-red-600 border-red-200",
  WARM: "bg-amber-50 text-amber-600 border-amber-200",
  COLD: "bg-sky-50 text-sky-600 border-sky-200",
}

type Props = {
  leadId: string
  currentScore: string | null
  currentReason: string | null
  lang: Language
}

export function ScoreLeadButton({ leadId, currentScore, currentReason, lang }: Props) {
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(currentScore)
  const [reason, setReason] = useState(currentReason)
  const router = useRouter()

  async function handleScore() {
    setLoading(true)
    try {
      const res = await fetch("/api/ai/score-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, language: lang }),
      })
      const data = await res.json()
      if (data.skipped) {
        toast.info(lang === "bn" ? "AI কনফিগার করা নেই" : "AI not configured")
        return
      }
      if (!res.ok) {
        toast.error(lang === "bn" ? "স্কোর করা ব্যর্থ হয়েছে" : "Scoring failed")
        return
      }
      setScore(data.aiScore)
      setReason(data.aiScoreReason)
      toast.success(lang === "bn" ? "লিড স্কোর আপডেট হয়েছে" : "Lead scored")
      router.refresh()
    } catch {
      toast.error("Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        {score && (
          <Badge variant="outline" className={cn("text-xs", SCORE_BADGE[score])}>
            {score}
          </Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleScore}
          disabled={loading}
          className="h-7 gap-1.5 text-xs"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {score
            ? lang === "bn" ? "পুনরায় স্কোর" : "Rescore"
            : lang === "bn" ? "AI স্কোর" : "AI Score"}
        </Button>
      </div>
      {reason && (
        <p className="text-xs text-muted-foreground italic">{reason}</p>
      )}
    </div>
  )
}
