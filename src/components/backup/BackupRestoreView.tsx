"use client";

import React, { useState, useEffect, useCallback } from "react";
import { invokeCommand } from "@/lib/tauri";
import { useAuth, getAuthToken } from "@/lib/auth-context";
import { BackupFileInfo, BackupResult } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Database,
  Archive,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  ShieldAlert,
  Loader2,
  RefreshCw,
  FolderArchive,
} from "lucide-react";

export function BackupRestoreView() {
  const { user, token: ctxToken } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const token = ctxToken || getAuthToken();

  const [backups, setBackups] = useState<BackupFileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackupResult, setLastBackupResult] = useState<BackupResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Restore confirmation modal
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupFileInfo | null>(null);
  const [confirmKeyword, setConfirmKeyword] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);

  const loadBackups = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const data: BackupFileInfo[] = await invokeCommand("list_backups", { token });
      setBackups(data || []);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `Gagal memuat daftar backup: ${err.message || err}` });
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const handleCreateBackup = async () => {
    if (!isAdmin) return;
    setIsBackingUp(true);
    setStatusMessage(null);
    try {
      const res: BackupResult = await invokeCommand("create_database_backup", { token });
      setLastBackupResult(res);
      setStatusMessage({
        type: "success",
        text: `Cadangan database berhasil dibuat: ${res.file_name} (${(res.file_size_bytes / 1024).toFixed(1)} KB)`,
      });
      await loadBackups();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `Gagal membuat backup: ${err.message || err}` });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!selectedBackupForRestore || confirmKeyword !== "PULIHKAN" || !isAdmin) return;
    setIsRestoring(true);
    setStatusMessage(null);
    try {
      await invokeCommand("restore_database_from_backup", {
        token,
        backup_path: selectedBackupForRestore.file_path,
      });
      setStatusMessage({
        type: "success",
        text: `Database berhasil dipulihkan dari file: ${selectedBackupForRestore.file_name}. Data cadangan pra-pemulihan otomatis telah disimpan demi keamanan.`,
      });
      setSelectedBackupForRestore(null);
      setConfirmKeyword("");
      await loadBackups();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `Gagal memulihkan database: ${err.message || err}` });
    } finally {
      setIsRestoring(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return isoStr;
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white border rounded-xl p-8 text-center max-w-lg mx-auto mt-12 shadow-sm space-y-4">
        <div className="p-4 bg-amber-100 text-amber-800 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Akses Dibatasi</h2>
        <p className="text-sm text-gray-600">
          Modul Cadangan (Backup) & Pemulihan (Restore) Database SQLite hanya dapat diakses dan dieksekusi oleh pengguna dengan peran <strong>Administrator</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-blue-100 text-blue-800 rounded-lg">
              <Database className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">Cadangan & Pemulihan Database</h1>
          </div>
          <p className="text-sm text-gray-500">
            Pencadangan snapshot instan SQLite (VACUUM INTO) secara lokal dan pemulihan data aman dengan perlindungan safety-backup otomatis.
          </p>
        </div>

        <Button
          onClick={handleCreateBackup}
          disabled={isBackingUp}
          className="bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-2 flex-shrink-0"
        >
          {isBackingUp ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Membuat Snapshot...
            </>
          ) : (
            <>
              <Archive className="w-4 h-4" />
              Buat Backup Sekarang
            </>
          )}
        </Button>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-sm border flex items-center justify-between ${
            statusMessage.type === "error"
              ? "bg-red-50 text-red-800 border-red-200"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "error" ? (
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-xs font-semibold underline">
            Tutup
          </button>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-5 text-xs text-blue-900 space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm text-blue-950">
          <HardDrive className="w-4 h-4 text-blue-700" />
          Tentang Keamanan Data Lokal SiMarta
        </div>
        <p className="leading-relaxed">
          SiMarta berjalan secara <strong>100% Offline</strong> dengan database lokal <strong>SQLite WAL mode</strong>. Snapshot backup dibuat menggunakan fungsi native <code>VACUUM INTO</code> yang menghasilkan salinan database utuh, terdefragmentasi, dan tidak mengganggu proses transaksi jemaat yang sedang berjalan.
        </p>
        <p className="leading-relaxed text-blue-800">
          <strong>Rekomendasi Pemeliharaan:</strong> Lakukan backup minimal sekali seminggu atau setelah melakukan pencatatan peristiwa penting (Baptis, Sidi, Atestasi). Salin file <code>.db</code> dari folder cadangan ke media penyimpanan eksternal (Flashdisk atau Harddisk Eksternal).
        </p>
      </div>

      {/* Backup List Table */}
      <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Daftar File Cadangan Database</h3>
            <Badge className="bg-gray-100 text-gray-700 border-gray-300 ml-1">{backups.length} File</Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadBackups}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Segarkan
          </Button>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-xs">Memeriksa file cadangan...</span>
          </div>
        ) : backups.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs border border-dashed rounded-lg bg-gray-50/50">
            Belum ada file cadangan yang dibuat. Klik tombol <strong>"Buat Backup Sekarang"</strong> di atas untuk membuat snapshot pertama.
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b text-gray-600 font-medium">
                <tr>
                  <th className="px-4 py-3">Nama File Cadangan</th>
                  <th className="px-4 py-3">Ukuran File</th>
                  <th className="px-4 py-3">Waktu Pembuatan</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                {backups.map((b) => (
                  <tr key={b.file_name} className="hover:bg-gray-50/60 transition">
                    <td className="px-4 py-3 font-mono font-medium text-gray-900 flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{b.file_name}</span>
                      {b.file_name.includes("safety_pre_restore") && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] ml-2">
                          Safety Auto
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600">{formatFileSize(b.file_size_bytes)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDateTime(b.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBackupForRestore(b);
                          setConfirmKeyword("");
                        }}
                        className="text-xs border-amber-300 text-amber-800 hover:bg-amber-50 hover:text-amber-900"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Pulihkan (Restore)
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Pemulihan Bahaya (Danger Restore Modal) */}
      {selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-full">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Konfirmasi Pemulihan Database</h3>
                <p className="text-xs text-red-600">Tindakan ini memerlukan kehati-hatian tingkat tinggi</p>
              </div>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-2">
              <p className="font-semibold leading-relaxed">
                Anda akan memulihkan data dari file:
              </p>
              <p className="font-mono bg-white p-2 rounded border border-red-200 text-gray-900">
                {selectedBackupForRestore.file_name}
              </p>
              <p className="leading-relaxed">
                Semua data jemaat, keluarga, dan transaksi gerejawi saat ini akan digantikan dengan data yang ada di snapshot ini. Sistem akan secara otomatis membuat cadangan keamanan (<strong>safety_pre_restore</strong>) sebelum proses pemulihan dimulai.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">
                Ketik kata <span className="font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">PULIHKAN</span> untuk mengonfirmasi:
              </label>
              <Input
                value={confirmKeyword}
                onChange={(e) => setConfirmKeyword(e.target.value)}
                placeholder="PULIHKAN"
                className="font-mono text-center tracking-wider"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedBackupForRestore(null);
                  setConfirmKeyword("");
                }}
                disabled={isRestoring}
              >
                Batal
              </Button>
              <Button
                onClick={handleExecuteRestore}
                disabled={confirmKeyword !== "PULIHKAN" || isRestoring}
                className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memulihkan Database...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Ya, Pulihkan Database Ini
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
