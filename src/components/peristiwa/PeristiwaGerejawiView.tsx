"use client";

import React, { useState, useEffect, useCallback } from "react";
import { invokeCommand } from "@/lib/tauri";
import { useAuth, getAuthToken } from "@/lib/auth-context";
import { PeristiwaGerejawiItem, AtestasiItem, KematianItem } from "@/types";
import { BaptisSidiFormDialog } from "./BaptisSidiFormDialog";
import { PerkawinanFormDialog } from "./PerkawinanFormDialog";
import { AtestasiFormDialog } from "./AtestasiFormDialog";
import { KematianFormDialog } from "./KematianFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CalendarCheck,
  Heart,
  ArrowRightLeft,
  Search,
  Plus,
  RefreshCw,
  AlertTriangle,
  FileText,
  Church,
  Cross,
  UserX,
  Loader2,
  Calendar,
} from "lucide-react";

export function PeristiwaGerejawiView() {
  const { user, token: ctxToken } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const token = ctxToken || getAuthToken();

  const [activeTab, setActiveTab] = useState<"sakramen" | "atestasi" | "kematian">("sakramen");

  // Data states
  const [peristiwaList, setPeristiwaList] = useState<PeristiwaGerejawiItem[]>([]);
  const [atestasiList, setAtestasiList] = useState<AtestasiItem[]>([]);
  const [kematianList, setKematianList] = useState<KematianItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedJenisPeristiwa, setSelectedJenisPeristiwa] = useState("");

  // Dialog states
  const [isBaptisSidiOpen, setIsBaptisSidiOpen] = useState(false);
  const [baptisSidiDefaultJenis, setBaptisSidiDefaultJenis] = useState<"BAPTIS" | "SIDI">("BAPTIS");
  const [isPerkawinanOpen, setIsPerkawinanOpen] = useState(false);
  const [isAtestasiOpen, setIsAtestasiOpen] = useState(false);
  const [isKematianOpen, setIsKematianOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);

      const [peristiwaRes, atestasiRes, kematianRes] = await Promise.all([
        invokeCommand<PeristiwaGerejawiItem[]>("list_peristiwa_gerejawi", {
          token,
          jenis_peristiwa: selectedJenisPeristiwa || undefined,
          search: search || undefined,
        }),
        invokeCommand<AtestasiItem[]>("list_atestasi", {
          token,
          search: search || undefined,
        }),
        invokeCommand<KematianItem[]>("list_kematian", {
          token,
          search: search || undefined,
        }),
      ]);

      setPeristiwaList(peristiwaRes);
      setAtestasiList(atestasiRes);
      setKematianList(kematianRes);
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedJenisPeristiwa, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Peristiwa Gerejawi & Mutasi Keanggotaan
          </h1>
          <p className="text-sm text-slate-500">
            Pencatatan Sakramen Baptis, Sidi, Pernikahan Kudus, Atestasi Pindah, dan Berita Duka Kematian
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  setBaptisSidiDefaultJenis("BAPTIS");
                  setIsBaptisSidiOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Baptis / Sidi</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setIsPerkawinanOpen(true)}
                className="bg-pink-600 hover:bg-pink-700 text-white flex items-center gap-1.5 shadow-sm text-xs"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Perkawinan</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAtestasiOpen(true)}
                className="flex items-center gap-1.5 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Atestasi Pindah</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsKematianOpen(true)}
                className="flex items-center gap-1.5 text-xs text-slate-700 border-slate-300 hover:bg-slate-100"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Berita Duka</span>
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("sakramen")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "sakramen"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Church className="w-4 h-4" />
          <span>Sakramen & Peristiwa Sakral</span>
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 font-mono">
            {peristiwaList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("atestasi")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "atestasi"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Mutasi Atestasi</span>
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 font-mono">
            {atestasiList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("kematian")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "kematian"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <UserX className="w-4 h-4" />
          <span>Berita Duka & Kematian</span>
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 font-mono">
            {kematianList.length}
          </span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            placeholder="Cari nama jemaat, nomor surat, pelayan firman..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>

        {activeTab === "sakramen" && (
          <div className="w-full sm:w-60">
            <select
              value={selectedJenisPeristiwa}
              onChange={(e) => setSelectedJenisPeristiwa(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Peristiwa Sakral</option>
              <option value="BAPTIS">Sakramen Baptis</option>
              <option value="SIDI">Peneguhan Sidi</option>
              <option value="PERKAWINAN">Pernikahan Kudus</option>
              <option value="PENGAKUAN_DOSA">Pengakuan Dosa</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Sakramen & Peristiwa Sakral */}
      {activeTab === "sakramen" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase">
                <tr>
                  <th className="py-3 px-4">Nama Jemaat</th>
                  <th className="py-3 px-4">Jenis Peristiwa</th>
                  <th className="py-3 px-4">Tanggal & Tempat</th>
                  <th className="py-3 px-4">Nomor Surat / Akta</th>
                  <th className="py-3 px-4">Pelayan Firman</th>
                  <th className="py-3 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                      <span>Memuat data peristiwa gerejawi...</span>
                    </td>
                  </tr>
                ) : peristiwaList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Belum ada data peristiwa gerejawi yang sesuai.
                    </td>
                  </tr>
                ) : (
                  peristiwaList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{p.nama_lengkap}</div>
                        <div className="text-xs font-mono text-slate-400">
                          {p.nomor_anggota} &bull; {p.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            p.jenis_peristiwa === "BAPTIS"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : p.jenis_peristiwa === "SIDI"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : p.jenis_peristiwa === "PERKAWINAN"
                              ? "bg-pink-50 text-pink-700 border border-pink-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {p.jenis_peristiwa}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{p.tanggal_peristiwa}</div>
                        <div className="text-xs text-slate-400">{p.tempat || "GMIST Maranatha"}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs text-slate-800">
                          {p.nomor_surat || "-"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-700">{p.pelayan_firman || "-"}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-600 max-w-xs truncate">
                          {p.keterangan || "-"}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Mutasi Atestasi */}
      {activeTab === "atestasi" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase">
                <tr>
                  <th className="py-3 px-4">Nama Jemaat</th>
                  <th className="py-3 px-4">Jenis Atestasi</th>
                  <th className="py-3 px-4">Gereja Asal / Tujuan</th>
                  <th className="py-3 px-4">Tanggal Mutasi</th>
                  <th className="py-3 px-4">Nomor Surat Atestasi</th>
                  <th className="py-3 px-4">Alasan / Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                      <span>Memuat data atestasi...</span>
                    </td>
                  </tr>
                ) : atestasiList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Belum ada riwayat surat atestasi pindah jemaat.
                    </td>
                  </tr>
                ) : (
                  atestasiList.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{a.nama_lengkap}</div>
                        <div className="text-xs font-mono text-slate-400">{a.nomor_anggota}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            a.status_baru === "PINDAH"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {a.status_baru === "PINDAH" ? "Pindah Keluar" : "Pindah Masuk"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{a.jemaat_tujuan_asal || "-"}</div>
                        <div className="text-[11px] text-slate-400">
                          {a.status_baru === "PINDAH" ? "Gereja Tujuan" : "Gereja Asal"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{a.tanggal_perubahan}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs text-slate-800">{a.nomor_surat || "-"}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-600 max-w-xs truncate">{a.alasan || "-"}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Berita Duka & Kematian */}
      {activeTab === "kematian" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase">
                <tr>
                  <th className="py-3 px-4">Nama Jemaat</th>
                  <th className="py-3 px-4">Tanggal Lahir & Wafat</th>
                  <th className="py-3 px-4">Tempat Meninggal & Pemakaman</th>
                  <th className="py-3 px-4">Pelayan Pemakaman</th>
                  <th className="py-3 px-4">Nomor Surat / Akta</th>
                  <th className="py-3 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                      <span>Memuat arsip berita duka...</span>
                    </td>
                  </tr>
                ) : kematianList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Belum ada arsip data kematian jemaat.
                    </td>
                  </tr>
                ) : (
                  kematianList.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{k.nama_lengkap}</div>
                        <div className="text-xs font-mono text-slate-400">
                          {k.nomor_anggota} &bull; {k.jenis_kelamin === "L" ? "L" : "P"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-red-600">Wafat: {k.tanggal_meninggal}</div>
                        <div className="text-xs text-slate-400">Lahir: {k.tanggal_lahir}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{k.tempat_pemakaman || "-"}</div>
                        <div className="text-xs text-slate-400">{k.tempat_meninggal || "-"}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-700">{k.pelayan_pemakaman || "-"}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs text-slate-800">{k.nomor_surat_kematian || "-"}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-600 max-w-xs truncate">{k.keterangan || "-"}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <BaptisSidiFormDialog
        isOpen={isBaptisSidiOpen}
        onClose={() => setIsBaptisSidiOpen(false)}
        onSuccess={() => loadData()}
        defaultJenis={baptisSidiDefaultJenis}
      />

      <PerkawinanFormDialog
        isOpen={isPerkawinanOpen}
        onClose={() => setIsPerkawinanOpen(false)}
        onSuccess={() => loadData()}
      />

      <AtestasiFormDialog
        isOpen={isAtestasiOpen}
        onClose={() => setIsAtestasiOpen(false)}
        onSuccess={() => loadData()}
      />

      <KematianFormDialog
        isOpen={isKematianOpen}
        onClose={() => setIsKematianOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
