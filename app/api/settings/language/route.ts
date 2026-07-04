import { NextResponse } from "next/server"
import { z } from "zod"
import { getSession } from "@/lib/session"
import { parseJsonBody } from "@/lib/parse-body";

const schema = z.object({ lang: z.enum(["en", "bn"]) })

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return new Response("Unauthorized", { status: 401 })

  const { data: body, error: bodyError } = await parseJsonBody(req);
  if (bodyError) return bodyError;
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set("lang", parsed.data.lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
    httpOnly: false, // readable client-side for display
  })
  return res
}
