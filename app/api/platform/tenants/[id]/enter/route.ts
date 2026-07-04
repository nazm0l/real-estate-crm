import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { id: true, companyName: true },
  });
  if (!tenant) return new Response("Tenant not found", { status: 404 });

  const adminRole = await prisma.role.findFirst({
    where: { tenantId: id, isSystem: true },
    select: { id: true },
  });
  if (!adminRole) {
    return NextResponse.json({ error: "Tenant has no Company Admin role" }, { status: 400 });
  }

  const res = NextResponse.json({ entered: tenant });
  const cookieOpts = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 8, // 8 hours
  };
  res.cookies.set("platform_active_tenant", tenant.id, cookieOpts);
  res.cookies.set("platform_active_role", adminRole.id, cookieOpts);
  return res;
}
