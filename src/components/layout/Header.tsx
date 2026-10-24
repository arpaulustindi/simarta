"use client";

import React from "react";
import { LogOut, User, Moon, Sun, ShieldCheck, WifiOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Header({ activeTabTitle }: { activeTabTitle: string }) {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = React.useState(false);

  const toggleDarkMode = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  };

  return (
    <header className="flex h-16 w-full items-center justify-between border-b bg-card px-6 select-none">
      {/* Breadcrumb / Title */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          {activeTabTitle}
        </h2>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          / Sistem Informasi GMIST Maranatha Tahuna
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Offline Badge Indicator */}
        <div className="flex items-center gap-1.5 rounded-full border bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
          <WifiOff className="h-3.5 w-3.5" />
          <span>Full Offline</span>
        </div>

        {/* Theme Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleDarkMode}
          title={isDark ? "Ubah ke Mode Terang" : "Ubah ke Mode Gelap"}
          className="h-8 w-8"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* User Pill */}
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-semibold text-xs">
            <User className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold leading-tight text-foreground">
              {user?.full_name || user?.username}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              {user?.role === "ADMIN" ? "Administrator" : "Operator Jemaat"}
            </span>
          </div>
          <Badge variant={user?.role === "ADMIN" ? "default" : "secondary"} className="ml-1 text-[10px] py-0 px-1.5">
            {user?.role}
          </Badge>
        </div>

        {/* Logout Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => logout()}
          className="flex items-center gap-1.5 text-xs text-destructive hover:bg-destructive hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Keluar</span>
        </Button>
      </div>
    </header>
  );
}
