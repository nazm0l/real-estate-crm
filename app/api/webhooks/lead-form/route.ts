import { NextResponse } from "next/server";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { normalizeBDPhone } from "@/lib/bd-phone";

export async function GET(req: Request) {
  const url = new URL(req.url)
  const mode = url.searchParams.get("hub.mode")
  const token = url.searchParams.get("hub.verify_token")
  const challenge = url.searchParams.get("hub.challenge")
  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response("Forbidden", { status: 403 })
}

// Real Meta Lead Ads webhooks identify the source by Page/Form ID, not tenantId,
// and require X-Hub-Signature-256 verification + a GET challenge/response handshake.
// Both depend on the Meta Ads integration (Phase 4). Until then this endpoint is
// guarded by a shared secret and accepts tenantId directly in the payload so the
// lead-creation/dedup logic can be built and tested now.
const leadFormSchema = z.object({
  tenantId: z.string(),
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  locationArea: z.string().optional(),
});

export async function POST(req: Request) {
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) return new Response("Webhook not configured", { status: 503 });
  if (req.headers.get("x-webhook-token") !== verifyToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const raw = await req.text();

  // When META_APP_SECRET is set, require Meta's payload signature on top of the token
  const appSecret = process.env.META_APP_SECRET;
  if (appSecret) {
    const sig = req.headers.get("x-hub-signature-256");
    const expected = `sha256=${createHmac("sha256", appSecret).update(raw, "utf8").digest("hex")}`;
    const valid =
      !!sig &&
      sig.length === expected.length &&
      timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!valid) return new Response("Invalid signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = leadFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { tenantId, name, email, locationArea } = parsed.data;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: "Unknown tenant" }, { status: 400 });

  const normalizedPhone = normalizeBDPhone(parsed.data.phone);
  if (!normalizedPhone) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  // LeadActivity.createdById is required, but a webhook call has no session user.
  // Attribute system-generated activity entries to the tenant's Company Admin,
  // which always exists (registration creates one, and it can never be removed
  // while it's the last admin — see /api/team/[id] DELETE).
  const companyAdmin = await prisma.user.findFirst({
    where: { tenantId, role: { isSystem: true } },
    select: { id: true },
  });
  if (!companyAdmin) {
    return NextResponse.json({ error: "Tenant has no Company Admin to attribute activity to" }, { status: 500 });
  }

  const existing = await prisma.lead.findFirst({ where: { tenantId, phone: normalizedPhone } });
  if (existing) {
    await prisma.leadActivity.create({
      data: {
        leadId: existing.id,
        createdById: companyAdmin.id,
        type: "note",
        description: "Duplicate Meta lead form submission received",
      },
    });
    return NextResponse.json({ duplicate: true, leadId: existing.id });
  }

  const lead = await prisma.lead.create({
    data: {
      tenantId,
      name,
      phone: normalizedPhone,
      email,
      locationArea,
      source: "FACEBOOK",
      activities: {
        create: { createdById: companyAdmin.id, type: "note", description: "Lead created from Meta Lead Form" },
      },
    },
  });

  return NextResponse.json({ created: true, leadId: lead.id }, { status: 201 });
}
