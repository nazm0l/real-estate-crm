import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/require-platform-admin";
import { SignOutButton } from "@/components/platform/SignOutButton";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { error, session } = await requirePlatformAdmin();
  if (error) redirect("/");

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
        <Link href="/platform" className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-5 text-primary" />
          Platform Admin
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
