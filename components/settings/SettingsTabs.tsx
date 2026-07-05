"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PERMISSIONS, type Permission } from "@/lib/permissions";

const TABS: { href: string; label: string; permission: Permission }[] = [
  { href: "/settings/workspace", label: "Workspace", permission: PERMISSIONS.ROLES_MANAGE },
  { href: "/settings/team", label: "Team", permission: PERMISSIONS.TEAM_VIEW },
  { href: "/settings/roles", label: "Roles", permission: PERMISSIONS.ROLES_VIEW },
];

export function SettingsTabs({ permissions }: { permissions: Permission[] }) {
  const pathname = usePathname();
  const visibleTabs = TABS.filter((tab) => permissions.includes(tab.permission));

  return (
    <div className="flex gap-1 border-b border-border">
      {visibleTabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px rounded-t-md border-b-2 px-4 py-2 text-sm transition-colors",
              active
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
