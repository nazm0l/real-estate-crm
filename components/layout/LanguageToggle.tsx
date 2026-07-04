"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import type { Language } from "@/lib/language"

export function LanguageToggle({ current }: { current: Language }) {
  const [lang, setLang] = useState<Language>(current)
  const [, startTransition] = useTransition()
  const router = useRouter()

  async function toggle() {
    const next: Language = lang === "en" ? "bn" : "en"
    await fetch("/api/settings/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: next }),
    })
    setLang(next)
    startTransition(() => router.refresh())
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="px-2 font-medium text-xs tabular-nums w-9 h-8"
      title={lang === "en" ? "Switch to Bangla" : "Switch to English"}
    >
      {lang === "en" ? "বাং" : "EN"}
    </Button>
  )
}
