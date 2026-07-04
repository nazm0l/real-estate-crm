import { NextResponse } from "next/server"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"
import { requirePermission } from "@/lib/require-permission"
import { PERMISSIONS } from "@/lib/permissions"
import { SYSTEM_PROMPTS, type Language } from "@/lib/language"
import { prisma } from "@/lib/db"
import { formatBDT } from "@/lib/format-bdt"
import { startOfToday } from "@/lib/payment-status"
import { parseJsonBody } from "@/lib/parse-body";

const schema = z.object({
  message: z.string().min(1).max(1000),
  language: z.enum(["en", "bn"]).default("en"),
})

export async function POST(req: Request) {
  const { error, session } = await requirePermission(PERMISSIONS.AI_CHAT)
  if (error) return error

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ skipped: true })
  }

  const { data: body, error: bodyError } = await parseJsonBody(req);

  if (bodyError) return bodyError;
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }
  const { message, language } = parsed.data as { message: string; language: Language }

  // Gather tenant context for grounding the assistant
  const today = startOfToday()
  const [leadCounts, overduePayments, upcomingVisits] = await Promise.all([
    prisma.lead.groupBy({
      by: ["pipelineStage"],
      where: { tenantId: session.user.tenantId },
      _count: { id: true },
    }),
    prisma.payment.aggregate({
      where: {
        tenantId: session.user.tenantId,
        status: "PENDING",
        dueDate: { lt: today },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.siteVisit.count({
      where: {
        tenantId: session.user.tenantId,
        status: "SCHEDULED",
        scheduledAt: { gte: today },
      },
    }),
  ])

  const leadSummary = leadCounts
    .map((g) => `${g.pipelineStage}: ${g._count.id}`)
    .join(", ")
  const overdueAmt = overduePayments._sum.amount ?? 0
  const overdueCount = overduePayments._count.id

  const contextBlock = `
Current CRM snapshot for this workspace:
- Leads by stage: ${leadSummary || "none"}
- Overdue payments: ${overdueCount} (total ${formatBDT(overdueAmt)})
- Upcoming scheduled visits: ${upcomingVisits}
Today's date: ${today.toISOString().slice(0, 10)}
`.trim()

  const systemPrompt = `${SYSTEM_PROMPTS[language]}\n\n${contextBlock}`

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: message }],
  })

  const reply =
    response.content[0]?.type === "text" ? response.content[0].text : ""
  return NextResponse.json({ reply })
}
