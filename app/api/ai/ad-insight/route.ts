import { NextResponse } from "next/server"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"
import { requirePermission } from "@/lib/require-permission"
import { PERMISSIONS } from "@/lib/permissions"
import { SYSTEM_PROMPTS, type Language } from "@/lib/language"
import { prisma } from "@/lib/db"
import { formatBDT } from "@/lib/format-bdt"
import { parseJsonBody } from "@/lib/parse-body";

const schema = z.object({ language: z.enum(["en", "bn"]).default("en") })

export async function POST(req: Request) {
  const { error, session } = await requirePermission(PERMISSIONS.ADS_VIEW)
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
  const language = (parsed.data.language ?? "en") as Language

  const campaigns = await prisma.metaAdCampaign.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { spendBdt: "desc" },
  })

  if (campaigns.length === 0) {
    const noDataMsg =
      language === "bn"
        ? "কোনো বিজ্ঞাপন ডেটা পাওয়া যায়নি। প্রথমে Meta Ads সিঙ্ক করুন।"
        : "No ad data found. Sync your Meta Ads first."
    return NextResponse.json({ insight: noDataMsg })
  }

  const totalSpend = campaigns.reduce((s, c) => s + c.spendBdt, 0)
  const totalLeads = campaigns.reduce((s, c) => s + c.leadsCount, 0)
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0)
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0)

  const campaignLines = campaigns
    .slice(0, 5)
    .map(
      (c) =>
        `• ${c.name}: spend=${formatBDT(c.spendBdt)}, leads=${c.leadsCount}, clicks=${c.clicks}, impressions=${c.impressions}`
    )
    .join("\n")

  const prompt = `Analyze these Meta Ads campaigns for a Bangladesh real estate company and give a brief insight with budget suggestions.

Top campaigns:
${campaignLines}

Totals: spend=${formatBDT(totalSpend)}, leads=${totalLeads}, clicks=${totalClicks}, impressions=${totalImpressions}
CPL=${totalLeads > 0 ? formatBDT(totalSpend / totalLeads) : "N/A"}
CTR=${totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + "%" : "N/A"}

Give 3-4 bullet points covering: performance summary, what's working, what to improve, budget suggestions. Keep it actionable and concise.`

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: SYSTEM_PROMPTS[language],
    messages: [{ role: "user", content: prompt }],
  })

  const insight =
    response.content[0]?.type === "text" ? response.content[0].text : ""
  return NextResponse.json({ insight })
}
