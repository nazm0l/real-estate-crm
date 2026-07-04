import { NextResponse } from "next/server";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { auth, INTERNAL_SIGNUP_HEADER, internalSignupToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";
import { parseJsonBody } from "@/lib/parse-body";

const registerSchema = z.object({
  companyName: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const { data: body, error: bodyError } = await parseJsonBody(req);
  if (bodyError) return bodyError;
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { companyName, name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const { tenant, companyAdminRoleId } = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: { companyName } });

    let companyAdminRoleId = "";
    for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const role = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: roleName,
          isSystem: roleName === "Company Admin",
          isDefault: roleName === "Agent",
          permissions: {
            create: permissions.map((permission) => ({ permission })),
          },
        },
      });
      if (roleName === "Company Admin") companyAdminRoleId = role.id;
    }

    return { tenant, companyAdminRoleId };
  }, { timeout: 20000 }); // seeding 4 roles + permissions over a Neon connection can be slow on a cold start

  try {
    const result = await auth.api.signUpEmail({
      body: { name, email, password, tenantId: tenant.id, roleId: companyAdminRoleId },
      headers: new Headers({ [INTERNAL_SIGNUP_HEADER]: internalSignupToken() }),
    });
    return NextResponse.json({ id: result.user.id, email: result.user.email }, { status: 201 });
  } catch (err) {
    await prisma
      .$transaction([
        prisma.rolePermission.deleteMany({ where: { role: { tenantId: tenant.id } } }),
        prisma.role.deleteMany({ where: { tenantId: tenant.id } }),
        prisma.tenant.delete({ where: { id: tenant.id } }),
      ])
      .catch(() => null);
    const message = err instanceof APIError ? err.message : "Could not create your account";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
