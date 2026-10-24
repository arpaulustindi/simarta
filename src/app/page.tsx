"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { SetupWizard } from "@/components/auth/SetupWizard";
import { LoginForm } from "@/components/auth/LoginForm";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { JemaatListView } from "@/components/jemaat/JemaatListView";
import { KeluargaListView } from "@/components/keluarga/KeluargaListView";
import { KelompokListView } from "@/components/kelompok/KelompokListView";
import { PelkaView } from "@/components/pelka/PelkaView";
import { JabatanView } from "@/components/jabatan/JabatanView";
import { PeristiwaGerejawiView } from "@/components/peristiwa/PeristiwaGerejawiView";
import { ImportExportView } from "@/components/impor_ekspor/ImportExportView";
import { BackupRestoreView } from "@/components/backup/BackupRestoreView";
import { AuditLogView } from "@/components/audit/AuditLogView";
import { SettingsView } from "@/components/settings/SettingsView";
import { Church, Loader2 } from "lucide-react";

export default function HomePage() {
  const { user, isLoading, needsSetup } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg animate-pulse">
            <Church className="h-7 w-7" />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span>Memulai SiMarta (GMIST Maranatha Tahuna)...</span>
          </div>
        </div>
      </div>
    );
  }

  // 1. First-time setup when no admin exists
  if (needsSetup) {
    return <SetupWizard />;
  }

  // 2. Login screen
  if (!user) {
    return <LoginForm />;
  }

  // 3. Main Application Dashboard & Views
  return (
    <AppLayout activeTab={activeTab} onSelectTab={setActiveTab}>
      {activeTab === "dashboard" && <DashboardView />}
      {activeTab === "jemaat" && <JemaatListView />}
      {activeTab === "keluarga" && <KeluargaListView />}
      {activeTab === "kelompok" && <KelompokListView />}
      {activeTab === "pelka" && <PelkaView />}
      {activeTab === "jabatan" && <JabatanView />}
      {activeTab === "peristiwa" && <PeristiwaGerejawiView />}
      {activeTab === "import_export" && <ImportExportView />}
      {activeTab === "backup" && <BackupRestoreView />}
      {activeTab === "audit" && <AuditLogView />}
      {activeTab === "settings" && <SettingsView />}
    </AppLayout>
  );
}

