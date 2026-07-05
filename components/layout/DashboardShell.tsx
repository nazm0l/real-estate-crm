"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/ai/ChatSidebar";
import { ActingBanner } from "@/components/platform/ActingBanner";
import type { Language } from "@/lib/language";
import type { NotificationsPayload } from "@/lib/notifications";
import type { Permission } from "@/lib/permissions";

export function DashboardShell({
  companyName,
  userName,
  userEmail,
  roleName,
  lang,
  canChat,
  notifications,
  isPlatformAdmin,
  actingAsTenant,
  permissions,
  children,
}: {
  companyName: string;
  userName: string;
  userEmail: string;
  roleName: string;
  lang: Language;
  canChat: boolean;
  notifications: NotificationsPayload;
  isPlatformAdmin: boolean;
  actingAsTenant: { id: string; companyName: string } | null;
  permissions: Permission[];
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider style={{ "--sidebar-width": "14rem" } as React.CSSProperties}>
      <AppSidebar
        companyName={companyName}
        userName={userName}
        userEmail={userEmail}
        roleName={roleName}
        isPlatformAdmin={isPlatformAdmin}
        permissions={permissions}
      />
      <SidebarInset className="h-svh overflow-hidden">
        {actingAsTenant && <ActingBanner companyName={actingAsTenant.companyName} />}
        <TopBar
          userName={userName}
          userEmail={userEmail}
          roleName={roleName}
          lang={lang}
          notifications={notifications}
          permissions={permissions}
        />
        <main className="page-pattern min-h-0 flex-1 overflow-y-auto p-6">{children}</main>
      </SidebarInset>
      {canChat && <ChatSidebar lang={lang} />}
    </SidebarProvider>
  );
}
