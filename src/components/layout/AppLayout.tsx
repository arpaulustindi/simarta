"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export function AppLayout({
  children,
  activeTab: controlledTab,
  onSelectTab: controlledOnSelect,
}: AppLayoutProps) {
  const [internalTab, setInternalTab] = useState("dashboard");
  const activeTab = controlledTab ?? internalTab;
  const onSelectTab = controlledOnSelect ?? setInternalTab;

  const tabTitles: Record<string, string> = {
    dashboard: "Dashboard Administrasi",
    jemaat: "Data Jemaat",
    keluarga: "Kartu Keluarga",
    kelompok: "Kelompok Ibadah",
    pelka: "Pelayanan Kategorial (Pelka)",
    jabatan: "Jabatan Pelayanan Gerejawi",
    peristiwa: "Peristiwa Gerejawi",
    import_export: "Impor & Ekspor Data",
    backup: "Backup & Restore Database",
    audit: "Riwayat Audit Sistem",
    settings: "Pengaturan Aplikasi",
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar activeTab={activeTab} onSelectTab={onSelectTab} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header activeTabTitle={tabTitles[activeTab] || "SiMarta"} />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/20">
          {children}
        </main>
      </div>
    </div>
  );
}

