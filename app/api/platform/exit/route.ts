import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";

export async function POST() {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const res = NextResponse.json({ exited: true });
  res.cookies.delete("platform_active_tenant");
  res.cookies.delete("platform_active_role");
  return res;
}
