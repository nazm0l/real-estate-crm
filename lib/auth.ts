import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// Sign-up must only happen through our own server routes (register + team invite),
// because tenantId/roleId are client-suppliable additionalFields. Server callers
// prove themselves with this header; the token derives from BETTER_AUTH_SECRET so
// the raw secret never travels on the wire.
export const INTERNAL_SIGNUP_HEADER = "x-internal-signup";

export function internalSignupToken(): string {
  return createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "")
    .update("internal-sign-up-v1")
    .digest("hex");
}

function isInternalSignup(headers: Headers | undefined): boolean {
  const provided = headers?.get(INTERNAL_SIGNUP_HEADER);
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(internalSignupToken());
  return a.length === b.length && timingSafeEqual(a, b);
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    password: {
      hash: (password) => bcrypt.hash(password, 12),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email" && !isInternalSignup(ctx.headers)) {
        throw new APIError("FORBIDDEN", { message: "Public sign-up is disabled" });
      }
      // update-user would let a signed-in user overwrite their own tenantId/roleId
      // (additionalFields are input: true). The app never uses it — block outright.
      if (ctx.path === "/update-user") {
        throw new APIError("FORBIDDEN", { message: "Not available" });
      }
    }),
  },
  user: {
    modelName: "User",
    additionalFields: {
      tenantId: {
        type: "string",
        required: true,
        input: true,
      },
      roleId: {
        type: "string",
        required: true,
        input: true,
      },
    },
  },
  session: {
    modelName: "Session",
  },
  account: {
    modelName: "Account",
  },
  verification: {
    modelName: "Verification",
  },
});
