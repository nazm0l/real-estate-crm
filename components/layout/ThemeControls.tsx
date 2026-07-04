"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ACCENT_COLORS = [
  { id: "teal", label: "Teal", swatch: "bg-teal-600" },
  { id: "blue", label: "Blue", swatch: "bg-blue-600" },
  { id: "violet", label: "Violet", swatch: "bg-violet-600" },
  { id: "rose", label: "Rose", swatch: "bg-rose-600" },
  { id: "orange", label: "Orange", swatch: "bg-orange-600" },
  { id: "emerald", label: "Emerald", swatch: "bg-emerald-600" },
] as const;

export function ThemeControls() {
  const { theme, setTheme } = useTheme();
  const [accent, setAccent] = useState<string>("teal");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAccent(document.documentElement.getAttribute("data-theme") ?? "teal");
  }, []);

  function applyAccent(id: string) {
    setAccent(id);
    try {
      localStorage.setItem("theme-color", id);
    } catch {}
    if (id === "teal") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", id);
  }

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" title="Accent color">
              <Palette className="h-4 w-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-40">
          {ACCENT_COLORS.map((color) => (
            <DropdownMenuItem key={color.id} onClick={() => applyAccent(color.id)}>
              <span className={cn("mr-2 size-3.5 rounded-full", color.swatch)} />
              {color.label}
              {mounted && accent === color.id && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" title="Light / dark mode">
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="hidden h-4 w-4 dark:block" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="mr-2 h-4 w-4" />
            Light
            {mounted && theme === "light" && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon className="mr-2 h-4 w-4" />
            Dark
            {mounted && theme === "dark" && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <Monitor className="mr-2 h-4 w-4" />
            System
            {mounted && theme === "system" && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
