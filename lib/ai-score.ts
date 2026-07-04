import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/db"
import type { Language } from "@/lib/language"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Classification rules stay in English for reliability; only the reason's output language switches
const SCORING_SYSTEM: Record<Language, string> = {
  en: "You are a real estate lead scoring assistant for Bangladesh. Score leads as HOT (ready to buy, high budget, advanced stage), WARM (interested, mid-stage), or COLD (low engagement, early stage). Always use the score_lead tool. Write the reason in simple English.",
  bn: "You are a real estate lead scoring assistant for Bangladesh. Score leads as HOT (ready to buy, high budget, advanced stage), WARM (interested, mid-stage), or COLD (low engagement, early stage). Always use the score_lead tool. Write the reason in simple Bengali (Bangla).",
}

export async function autoScoreLead(
  leadId: string,
  tenantId: string,
  language: Language = "en"
): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) return

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId },
    select: {
      name: true,
      source: true,
      propertyType: true,
      budgetMin: true,
      budgetMax: true,
      locationArea: true,
      pipelineStage: true,
      activities: {
        select: { type: true, description: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  })
  if (!lead) return

  const budgetStr =
    lead.budgetMin || lead.budgetMax
      ? `${lead.budgetMin ?? "?"} – ${lead.budgetMax ?? "?"} BDT`
      : "unknown"
  const activitiesSummary = lead.activities
    .map((a) => `${a.type}: ${a.description}`)
    .join("; ") || "none"

  const prompt = `Score this real estate lead for the Bangladesh market.

Name: ${lead.name}
Source: ${lead.source}
Property type: ${lead.propertyType ?? "not specified"}
Budget: ${budgetStr}
Location area: ${lead.locationArea ?? "not specified"}
Pipeline stage: ${lead.pipelineStage}
Recent activities: ${activitiesSummary}`

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: SCORING_SYSTEM[language],
      messages: [{ role: "user", content: prompt }],
      tools: [
        {
          name: "score_lead",
          description: "Record the lead score and reason",
          input_schema: {
            type: "object" as const,
            properties: {
              score: {
                type: "string",
                enum: ["HOT", "WARM", "COLD"],
                description: "Lead temperature score",
              },
              reason: {
                type: "string",
                description: "One sentence reason (max 20 words)",
              },
            },
            required: ["score", "reason"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "score_lead" },
    })

    const toolUse = response.content.find((c) => c.type === "tool_use")
    if (!toolUse || toolUse.type !== "tool_use") return
    const { score, reason } = toolUse.input as { score: string; reason: string }

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        aiScore: score as "HOT" | "WARM" | "COLD",
        aiScoreReason: reason,
        aiScoredAt: new Date(),
      },
    })
  } catch {
    // Silently ignore — AI scoring is non-critical
  }
}
