import { getSession } from "@/lib/session";

export async function requirePlatformAdmin() {
  const session = await getSession();
  if (!session) return { error: new Response("Unauthorized", { status: 401 }) } as const;
  if (!session.user.isPlatformAdmin) {
    return { error: new Response("Forbidden", { status: 403 }) } as const;
  }
  return { session } as const;
}
