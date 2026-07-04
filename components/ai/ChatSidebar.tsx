"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Language } from "@/lib/language"

type Message = { role: "user" | "assistant"; text: string }

const PLACEHOLDER: Record<Language, string> = {
  en: "Ask about leads, payments, visits…",
  bn: "লিড, পেমেন্ট, ভিজিট সম্পর্কে জিজ্ঞেস করুন…",
}

export function ChatSidebar({ lang }: { lang: Language }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, open])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    setMessages((m) => [...m, { role: "user", text }])
    setLoading(true)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, language: lang }),
      })
      const data = await res.json()
      if (data.skipped) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text:
              lang === "bn"
                ? "AI কনফিগার করা নেই। ANTHROPIC_API_KEY সেট করুন।"
                : "AI not configured. Set ANTHROPIC_API_KEY.",
          },
        ])
        return
      }
      setMessages((m) => [...m, { role: "assistant", text: data.reply ?? "" }])
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: lang === "bn" ? "ত্রুটি হয়েছে।" : "An error occurred." },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all",
          "bg-primary text-primary-foreground hover:brightness-110"
        )}
        title={open ? "Close assistant" : "AI assistant"}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex w-[340px] flex-col rounded-xl border border-border bg-card shadow-xl overflow-hidden max-h-[520px]">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-primary/5">
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {lang === "bn" ? "AI সহকারী" : "AI Assistant"}
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-[240px] max-h-[360px]">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center mt-8">
                {lang === "bn"
                  ? "আপনার CRM সম্পর্কে যেকোনো প্রশ্ন করুন।"
                  : "Ask anything about your CRM data."}
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2 w-fit">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-muted-foreground">
                  {lang === "bn" ? "ভাবছি…" : "Thinking…"}
                </span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={PLACEHOLDER[lang]}
              className="min-h-[40px] max-h-[120px] resize-none text-sm"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
            />
            <Button
              size="icon"
              onClick={send}
              disabled={loading || !input.trim()}
              className="h-9 w-9 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
