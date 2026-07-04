import { NextResponse } from "next/server"
import { z } from "zod"
import { requirePermission } from "@/lib/require-permission"
import { PERMISSIONS } from "@/lib/permissions"
import { autoScoreLead } from "@/lib/ai-score"
import { parseJsonBody } from "@/lib/parse-body";

const schema = z.object({
  leadId: z.string().min(1),
  language: z.enum(["en", "bn"]).default("en"),
})

export async function POST(req: Request) {
  const { error, session } = await requirePermission(PERMISSIONS.AI_SCORE_LEADS)
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

  await autoScoreLead(parsed.data.leadId, session.user.tenantId, parsed.data.language)

  // Return the updated score from DB
  const { prisma } = await import("@/lib/db")
  const lead = await prisma.lead.findFirst({
    where: { id: parsed.data.leadId, tenantId: session.user.tenantId },
    select: { aiScore: true, aiScoreReason: true, aiScoredAt: true },
  })
  if (!lead) return new Response("Not found", { status: 404 })

  return NextResponse.json(lead)
}
