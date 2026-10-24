"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Home,
  Layers,
  HeartHandshake,
  Award,
  CalendarCheck,
  FileSpreadsheet,
  DatabaseBackup,
  ShieldAlert,
  Settings,
  ChevronLeft,
  ChevronRight,
  Church,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  title: string;
  icon: React.ElementType;
  id: string;
  adminOnly?: boolean;
  phase: string;
}

const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, id: "dashboard", phase: "Aktif" },
  { title: "Data Jemaat", icon: Users, id: "jemaat", phase: "Aktif" },
  { title: "Keluarga", icon: Home, id: "keluarga", phase: "Aktif" },
  { title: "Kelompok Ibadah", icon: Layers, id: "kelompok", phase: "Aktif" },
  { title: "Pelka", icon: HeartHandshake, id: "pelka", phase: "Aktif" },
  { title: "Jabatan Pelayanan", icon: Award, id: "jabatan", phase: "Aktif" },
  { title: "Peristiwa Gerejawi", icon: CalendarCheck, id: "peristiwa", phase: "Aktif" },
  { title: "Impor & Ekspor", icon: FileSpreadsheet, id: "import_export", phase: "Aktif" },
  { title: "Backup & Restore", icon: DatabaseBackup, id: "backup", adminOnly: true, phase: "Aktif" },
  { title: "Audit Log", icon: ShieldAlert, id: "audit", adminOnly: true, phase: "Aktif" },
  { title: "Pengaturan", icon: Settings, id: "settings", phase: "Aktif" },
];

export function Sidebar({
  activeTab,
  onSelectTab,
}: {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r bg-card transition-all duration-300 ease-in-out select-none",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b px-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
          <Church className="h-6 w-6" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="font-bold tracking-tight text-base text-blue-600 dark:text-blue-400">
              SiMarta
            </span>
            <span className="truncate text-xs text-muted-foreground font-medium">
              GMIST Maranatha Tahuna
            </span>
          </div>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isRestrictedForOperator = item.adminOnly && !isAdmin;
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (!isRestrictedForOperator) {
                  onSelectTab(item.id);
                }
              }}
              disabled={isRestrictedForOperator}
              title={
                isRestrictedForOperator
                  ? `${item.title} (Hanya dapat diakses Administrator)`
                  : item.title
              }
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all text-left",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : isRestrictedForOperator
                  ? "opacity-40 cursor-not-allowed hover:bg-transparent text-muted-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <div className="flex flex-1 items-center justify-between overflow-hidden">
                  <span className="truncate">{item.title}</span>
                  {item.phase !== "Aktif" && !isActive && (
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground/80 font-normal">
                      {item.phase}
                    </span>
                  )}
                  {isRestrictedForOperator && (
                    <span className="text-[10px] text-amber-500 font-medium">Admin</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* User Role Card */}
      {!collapsed && (
        <div className="m-3 p-3 rounded-lg border bg-muted/40 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-foreground">Akses Pengguna</span>
            <Badge variant={isAdmin ? "default" : "secondary"}>
              {user?.role || "GUEST"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {isAdmin
              ? "Hak akses penuh ke seluruh pengelolaan data, persetujuan Pelka, dan audit."
              : "Akses operator: pencarian data & input baru. Mutasi lama dibatasi."}
          </p>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-foreground"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
