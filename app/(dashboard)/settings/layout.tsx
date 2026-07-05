import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUserPermissions, type Permission } from "@/lib/permissions";
import { SettingsTabs } from "@/components/settings/SettingsTabs";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const granted = await getUserPermissions(session.user.roleId);
  const permissions = [...granted] as Permission[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Manage your workspace, team, and permissions.</p>
      </div>
      <SettingsTabs permissions={permissions} />
      {children}
    </div>
  );
}
