// One-off CLI to grant/revoke platform-admin access. Never exposed via any API route —
// this is the only way isPlatformAdmin is ever set. Usage:
//   node --env-file=.env.local scripts/set-platform-admin.mjs someone@example.com
//   node --env-file=.env.local scripts/set-platform-admin.mjs someone@example.com --off
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const revoke = process.argv.includes("--off");

  if (!email) {
    console.error("Usage: node scripts/set-platform-admin.mjs <email> [--off]");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { email },
    data: { isPlatformAdmin: !revoke },
  });

  console.log(
    revoke
      ? `Revoked platform-admin access from ${email}`
      : `Granted platform-admin access to ${email}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
