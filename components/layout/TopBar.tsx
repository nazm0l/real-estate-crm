"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Search, User } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeControls } from "@/components/layout/ThemeControls";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { CommandPalette } from "@/components/layout/CommandPalette";
import type { Language } from "@/lib/language";
import type { NotificationsPayload } from "@/lib/notifications";

export function TopBar({
  userName,
  userEmail,
  roleName,
  lang,
  notifications,
}: {
  userName: string;
  userEmail: string;
  roleName: string;
  lang: Language;
  notifications: NotificationsPayload;
}) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <div className="flex flex-1 justify-center sm:justify-start">
        <Button
          variant="outline"
          onClick={() => setSearchOpen(true)}
          className="hidden h-8 w-full max-w-64 justify-start gap-2 text-sm font-normal text-muted-foreground sm:flex"
        >
          <Search className="size-3.5" />
          Search…
          <kbd className="ml-auto rounded border border-border bg-muted px-1.5 font-mono text-[10px]">
            Ctrl K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search"
          onClick={() => setSearchOpen(true)}
          className="sm:hidden"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <NotificationsBell notifications={notifications} />
      <LanguageToggle current={lang} />
      <ThemeControls />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                  {initials || <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm sm:inline">{userName}</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{userName}</span>
                <span className="text-xs font-normal text-muted-foreground">{userEmail}</span>
                <span className="text-xs font-normal text-muted-foreground">{roleName}</span>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await authClient.signOut();
              router.push("/login");
              router.refresh();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
