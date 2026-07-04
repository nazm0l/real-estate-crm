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

export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/visits", label: "Visits", icon: CalendarCheck },
  { href: "/ads", label: "Ads", icon: Megaphone },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings/workspace", label: "Settings", icon: Settings },
];
