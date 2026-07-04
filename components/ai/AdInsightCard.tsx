"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import type { Language } from "@/lib/language"

export function AdInsightCard({ lang }: { lang: Language }) {
  const [loading, setLoading] = useState(false)
  const [insight, setInsight] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch("/api/ai/ad-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      })
      const data = await res.json()
      if (data.skipped) {
        toast.info(lang === "bn" ? "AI কনফিগার করা নেই" : "AI not configured")
        return
      }
      setInsight(data.insight ?? "")
      setCollapsed(false)
    } catch {
      toast.error(lang === "bn" ? "ত্রুটি হয়েছে" : "Error generating insight")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {lang === "bn" ? "AI বিশ্লেষণ" : "AI Ad Insight"}
        </CardTitle>
        <div className="flex items-center gap-2">
          {insight && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCollapsed((v) => !v)}
            >
              {collapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={generate}
            disabled={loading}
            className="h-7 gap-1.5 text-xs"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {insight
              ? lang === "bn" ? "আবার বিশ্লেষণ" : "Regenerate"
              : lang === "bn" ? "বিশ্লেষণ করুন" : "Generate"}
          </Button>
        </div>
      </CardHeader>
      {insight && !collapsed && (
        <CardContent>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{insight}</p>
        </CardContent>
      )}
      {!insight && (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {lang === "bn"
              ? "আপনার বিজ্ঞাপন ক্যাম্পেইনের AI বিশ্লেষণ ও বাজেট পরামর্শের জন্য Generate চাপুন।"
              : "Click Generate to get an AI analysis of your ad campaigns and budget suggestions."}
          </p>
        </CardContent>
      )}
    </Card>
  )
}
