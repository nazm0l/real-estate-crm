import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { Resend } from "resend";
import { APIError } from "better-auth/api";
import { auth, INTERNAL_SIGNUP_HEADER, internalSignupToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { parseJsonBody } from "@/lib/parse-body";

export async function GET() {
  const { error, session } = await requirePermission(PERMISSIONS.TEAM_VIEW);
  if (error) return error;

  const users = await prisma.user.findMany({
    where: { tenantId: session.user.tenantId },
    select: { id: true, name: true, email: true, createdAt: true, role: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}

const inviteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  roleId: z.string(),
});

export async function POST(req: Request) {
  const { error, session } = await requirePermission(PERMISSIONS.TEAM_INVITE);
  if (error) return error;

  const { data: body, error: bodyError } = await parseJsonBody(req);

  if (bodyError) return bodyError;
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, roleId } = parsed.data;

  const role = await prisma.role.findFirst({ where: { id: roleId, tenantId: session.user.tenantId } });
  if (!role) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });

  const tempPassword = crypto.randomBytes(9).toString("base64url");

  let user;
  try {
    const result = await auth.api.signUpEmail({
      body: { name, email, password: tempPassword, tenantId: session.user.tenantId, roleId },
      headers: new Headers({ [INTERNAL_SIGNUP_HEADER]: internalSignupToken() }),
    });
    user = { id: result.user.id, name: result.user.name, email: result.user.email };
  } catch (err) {
    const message = err instanceof APIError ? err.message : "Could not create this account";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let emailSent = false;
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId } });
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: `You've been invited to ${tenant?.companyName ?? "a workspace"} on the CRM`,
      text: `Hi ${name},\n\nYou've been invited to join ${tenant?.companyName ?? "your team"}'s CRM workspace.\n\nSign in at ${process.env.BETTER_AUTH_URL}/login with:\nEmail: ${email}\nTemporary password: ${tempPassword}\n\nPlease change your password after signing in.`,
    });
    emailSent = true;
  }

  return NextResponse.json({ user, emailSent, tempPassword: emailSent ? undefined : tempPassword }, { status: 201 });
}
