import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { parseJsonBody } from "@/lib/parse-body";

const workspaceSchema = z.object({
  companyName: z.string().min(2).optional(),
  logoUrl: z.string().url().nullable().optional(),
  // "" clears the ad account; omitted token = keep the saved one (never echoed back)
  metaAdAccountId: z
    .string()
    .trim()
    .transform((v) => v || null)
    .optional(),
  metaAccessToken: z
    .string()
    .trim()
    .transform((v) => v || null)
    .optional(),
});

export async function PATCH(req: Request) {
  const { error, session } = await requirePermission(PERMISSIONS.ROLES_MANAGE);
  if (error) return error;

  const { data: body, error: bodyError } = await parseJsonBody(req);

  if (bodyError) return bodyError;
  const parsed = workspaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tenant = await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: parsed.data,
    select: {
      id: true,
      companyName: true,
      logoUrl: true,
      metaAdAccountId: true,
      metaAccessToken: true,
    },
  });

  // Never return the raw token to the client
  return NextResponse.json({
    id: tenant.id,
    companyName: tenant.companyName,
    logoUrl: tenant.logoUrl,
    metaAdAccountId: tenant.metaAdAccountId,
    hasMetaToken: !!tenant.metaAccessToken,
  });
}
