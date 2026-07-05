import {
  LayoutDashboard,
  Users,
  Building2,
  Wallet,
  CalendarCheck,
  Megaphone,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { PERMISSIONS, type Permission } from "@/lib/permissions";

export const NAV_ITEMS: {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: Permission;
  anyOf?: Permission[];
}[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users, permission: PERMISSIONS.LEADS_VIEW },
  { href: "/properties", label: "Properties", icon: Building2, permission: PERMISSIONS.PROPERTIES_VIEW },
  { href: "/payments", label: "Payments", icon: Wallet, permission: PERMISSIONS.PAYMENTS_VIEW },
  { href: "/visits", label: "Visits", icon: CalendarCheck, permission: PERMISSIONS.VISITS_VIEW },
  { href: "/ads", label: "Ads", icon: Megaphone, permission: PERMISSIONS.ADS_VIEW },
  { href: "/reports", label: "Reports", icon: BarChart3, permission: PERMISSIONS.REPORTS_VIEW },
  {
    href: "/settings/workspace",
    label: "Settings",
    icon: Settings,
    // Settings has 3 independently-gated tabs — show the entry if any is reachable
    anyOf: [PERMISSIONS.ROLES_MANAGE, PERMISSIONS.TEAM_VIEW, PERMISSIONS.ROLES_VIEW],
  },
];

export function isNavItemVisible(
  item: { permission?: Permission; anyOf?: Permission[] },
  granted: Permission[]
): boolean {
  if (item.anyOf) return item.anyOf.some((p) => granted.includes(p));
  if (item.permission) return granted.includes(item.permission);
  return true;
}
