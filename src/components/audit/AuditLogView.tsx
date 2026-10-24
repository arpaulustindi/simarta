"use client";

import React, { useState, useEffect, useCallback } from "react";
import { invokeCommand } from "@/lib/tauri";
import { useAuth, getAuthToken } from "@/lib/auth-context";
import { AuditLogItem, AuditLogPaginationResult, AuditLogFilter } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCode,
  AlertTriangle,
  Loader2,
  Calendar,
  User,
  ShieldAlert,
} from "lucide-react";

export function AuditLogView() {
  const { user, token: ctxToken } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const token = ctxToken || getAuthToken();

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Detail Modal
  const [selectedEntry, setSelectedEntry] = useState<AuditLogItem | null>(null);

  const loadAuditLogs = useCallback(
    async (pageToLoad = 1) => {
      if (!isAdmin) return;
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const filter: AuditLogFilter = {
          action: filterAction || undefined,
          entity: filterEntity || undefined,
          search: searchQuery.trim() || undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          page: pageToLoad,
          page_size: pageSize,
        };

        const res: AuditLogPaginationResult = await invokeCommand("list_audit_logs", {
          token,
          filter,
        });

        setAuditLogs(res.items || []);
        setTotalRecords(res.total_records || 0);
        setTotalPages(res.total_pages || 1);
        setCurrentPage(res.page || 1);
      } catch (err: any) {
        setErrorMessage(`Gagal memuat log audit: ${err.message || err}`);
      } finally {
        setIsLoading(false);
      }
    },
    [isAdmin, token, filterAction, filterEntity, searchQuery, fromDate, toDate, pageSize]
  );

  useEffect(() => {
    loadAuditLogs(1);
  }, [loadAuditLogs]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadAuditLogs(1);
  };

  const handleResetFilter = () => {
    setFilterAction("");
    setFilterEntity("");
    setSearchQuery("");
    setFromDate("");
    setToDate("");
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return ts;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">CREATE</Badge>;
      case "UPDATE":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">UPDATE</Badge>;
      case "ARCHIVE":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">ARCHIVE</Badge>;
      case "DELETE":
      case "RESTORE":
        return <Badge className="bg-red-100 text-red-800 border-red-300">{action}</Badge>;
      case "IMPORT":
      case "EXPORT":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">{action}</Badge>;
      case "BACKUP":
        return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300">BACKUP</Badge>;
      case "LOGIN":
      case "LOGOUT":
        return <Badge className="bg-slate-100 text-slate-800 border-slate-300">{action}</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatJson = (raw?: string) => {
    if (!raw) return "-";
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
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
          Explorer Jejak Audit Log hanya dapat diakses oleh pengguna dengan peran <strong>Administrator</strong> demi integritas dan kerahasiaan riwayat tata kelola jemaat.
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
            <span className="p-2 bg-indigo-100 text-indigo-800 rounded-lg">
              <History className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">Jejak Rekam Audit (Audit Log Explorer)</h1>
          </div>
          <p className="text-sm text-gray-500">
            Pencatatan menyeluruh setiap perubahan data jemaat, keluarga, jabatan, mutasi kelompok, dan tindakan administratif sistem.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => loadAuditLogs(currentPage)}
          disabled={isLoading}
          className="flex items-center gap-2 text-xs flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Segarkan Data
        </Button>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs font-semibold underline">
            Tutup
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
        <form onSubmit={handleApplyFilter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Action Filter */}
          <div>
            <label className="text-[11px] font-semibold text-gray-600 block mb-1">Aksi (Action)</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full text-xs border rounded-lg p-2 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Semua Aksi</option>
              <option value="CREATE">CREATE (Tambah Data)</option>
              <option value="UPDATE">UPDATE (Perbarui Data)</option>
              <option value="ARCHIVE">ARCHIVE (Arsipkan)</option>
              <option value="DELETE">DELETE (Hapus)</option>
              <option value="RESTORE">RESTORE (Pemulihan)</option>
              <option value="LOGIN">LOGIN (Masuk Sesi)</option>
              <option value="LOGOUT">LOGOUT (Keluar Sesi)</option>
              <option value="IMPORT">IMPORT (Impor Excel)</option>
              <option value="EXPORT">EXPORT (Ekspor Excel)</option>
              <option value="BACKUP">BACKUP (Cadangan DB)</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div>
            <label className="text-[11px] font-semibold text-gray-600 block mb-1">Entitas Data</label>
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="w-full text-xs border rounded-lg p-2 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Semua Entitas</option>
              <option value="jemaat">jemaat</option>
              <option value="keluarga">keluarga</option>
              <option value="anggota_keluarga">anggota_keluarga</option>
              <option value="kelompok">kelompok</option>
              <option value="pelka">pelka</option>
              <option value="jabatan">jabatan</option>
              <option value="riwayat_gerejawi">riwayat_gerejawi</option>
              <option value="riwayat_keanggotaan">riwayat_keanggotaan</option>
              <option value="users">users</option>
              <option value="database">database</option>
            </select>
          </div>

          {/* Search Query */}
          <div>
            <label className="text-[11px] font-semibold text-gray-600 block mb-1">Cari Ringkasan / User</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kata kunci..."
                className="text-xs pl-8 h-9"
              />
            </div>
          </div>

          {/* From Date */}
          <div>
            <label className="text-[11px] font-semibold text-gray-600 block mb-1">Dari Tanggal</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="text-[11px] font-semibold text-gray-600 block mb-1">Sampai Tanggal</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-5 flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilter}
              className="text-xs"
            >
              Reset Filter
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              Terapkan Filter
            </Button>
          </div>
        </form>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Menampilkan halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> (Total <strong>{totalRecords}</strong> jejak audit)
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-gray-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-xs">Memuat jejak rekam audit...</span>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-xs border border-dashed rounded-lg bg-gray-50/50">
            Tidak ada rekaman audit yang sesuai dengan kriteria filter saat ini.
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 border-b text-gray-600 font-medium">
                <tr>
                  <th className="px-3 py-3 w-40">Waktu (WIB)</th>
                  <th className="px-3 py-3 w-36">Pengguna</th>
                  <th className="px-3 py-3 w-24">Aksi</th>
                  <th className="px-3 py-3 w-32">Entitas</th>
                  <th className="px-3 py-3">Ringkasan & Alasan Perubahan</th>
                  <th className="px-3 py-3 w-16 text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-700">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/60 transition">
                    <td className="px-3 py-3 font-mono text-gray-500 text-[11px] whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 bg-gray-100 rounded text-gray-600">
                          <User className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <p className="font-semibold text-gray-900 leading-tight">{log.username}</p>
                          <span className="text-[10px] text-gray-400 font-mono">{log.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">{getActionBadge(log.action)}</td>
                    <td className="px-3 py-3 font-mono font-medium text-gray-800">
                      {log.entity}
                      {log.entity_id && (
                        <span className="text-[10px] text-gray-400 block truncate max-w-[120px]">
                          {log.entity_id}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-900">{log.summary}</p>
                      {log.reason && (
                        <p className="text-[11px] text-emerald-800 mt-0.5 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                          Alasan: {log.reason}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEntry(log)}
                        className="h-7 w-7 p-0 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50"
                        title="Lihat Detail Diff JSON"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAuditLogs(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              className="text-xs flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Sebelumnya
            </Button>
            <span className="text-xs text-gray-500">
              Halaman {currentPage} dari {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAuditLogs(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
              className="text-xs flex items-center gap-1"
            >
              Selanjutnya
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Modal Detail JSON Diff */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-800 rounded-lg">
                  <FileCode className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Detail Rekam Jejak Audit</h3>
                  <p className="text-xs text-gray-500 font-mono">ID: {selectedEntry.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-3 rounded-xl border">
              <div>
                <span className="text-gray-500 block">Waktu Transaksi</span>
                <span className="font-mono font-medium text-gray-900">
                  {formatTimestamp(selectedEntry.timestamp)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Pengguna</span>
                <span className="font-semibold text-gray-900">
                  {selectedEntry.username} ({selectedEntry.role})
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Aksi & Entitas</span>
                <span className="font-mono font-medium text-gray-900">
                  {selectedEntry.action} pada {selectedEntry.entity}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">ID Entitas Target</span>
                <span className="font-mono text-gray-800">{selectedEntry.entity_id || "-"}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 block">Ringkasan</span>
                <span className="font-medium text-gray-900">{selectedEntry.summary}</span>
              </div>
              {selectedEntry.reason && (
                <div className="col-span-2">
                  <span className="text-gray-500 block">Alasan Formal Perubahan</span>
                  <span className="font-medium text-emerald-800">{selectedEntry.reason}</span>
                </div>
              )}
            </div>

            {/* JSON Data Diff */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-1">Data Sebelumnya (Old Data):</h4>
                <pre className="text-[11px] bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto max-h-48 font-mono">
                  {formatJson(selectedEntry.old_data)}
                </pre>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-1">Data Baru (New Data):</h4>
                <pre className="text-[11px] bg-gray-900 text-emerald-400 p-3 rounded-lg overflow-x-auto max-h-48 font-mono">
                  {formatJson(selectedEntry.new_data)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end">
              <Button variant="outline" onClick={() => setSelectedEntry(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
