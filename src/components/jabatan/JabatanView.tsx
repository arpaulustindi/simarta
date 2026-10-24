"use client";

import React, { useState, useEffect, useCallback } from "react";
import { invokeCommand } from "@/lib/tauri";
import { useAuth, getAuthToken } from "@/lib/auth-context";
import { JabatanItem, PejabatAktifItem } from "@/types";
import { PengangkatanJabatanDialog } from "./PengangkatanJabatanDialog";
import { AkhiriJabatanDialog } from "./AkhiriJabatanDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  Users,
  Search,
  Plus,
  RefreshCw,
  AlertTriangle,
  Clock,
  Briefcase,
  CheckCircle,
  Loader2,
  Filter,
} from "lucide-react";

export function JabatanView() {
  const { user, token: ctxToken } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const token = ctxToken || getAuthToken();

  const [activeTab, setActiveTab] = useState<"pejabat" | "master">("pejabat");
  const [jabatanList, setJabatanList] = useState<JabatanItem[]>([]);
  const [pejabatList, setPejabatList] = useState<PejabatAktifItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedLingkup, setSelectedLingkup] = useState<string>("");
  const [selectedJabatanId, setSelectedJabatanId] = useState<string>("");

  // Dialog states
  const [isPengangkatanOpen, setIsPengangkatanOpen] = useState(false);
  const [selectedAkhiriPejabat, setSelectedAkhiriPejabat] = useState<PejabatAktifItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);

      const [jabs, pejs] = await Promise.all([
        invokeCommand<JabatanItem[]>("list_jabatan", { token }),
        invokeCommand<PejabatAktifItem[]>("list_pejabat_aktif", {
          token,
          lingkup: selectedLingkup || undefined,
          jabatan_id: selectedJabatanId || undefined,
        }),
      ]);

      setJabatanList(jabs);
      setPejabatList(pejs);
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedLingkup, selectedJabatanId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredPejabat = pejabatList.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.nama_lengkap.toLowerCase().includes(q) ||
      p.nomor_anggota.toLowerCase().includes(q) ||
      p.nama_jabatan.toLowerCase().includes(q) ||
      (p.nama_kelompok && p.nama_kelompok.toLowerCase().includes(q)) ||
      (p.nama_pelka && p.nama_pelka.toLowerCase().includes(q)) ||
      (p.keterangan && p.keterangan.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Jabatan & Pelayan Khusus
          </h1>
          <p className="text-sm text-slate-500">
            Penatua, Diaken, Badan Pengurus Pelka, dan Pelayan Wilayah Kelompok
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              onClick={() => setIsPengangkatanOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Pengangkatan Baru</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
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
          onClick={() => setActiveTab("pejabat")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "pejabat"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Pejabat Pelayanan Aktif</span>
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 font-mono">
            {pejabatList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("master")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "master"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Struktur & Daftar Jabatan</span>
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 font-mono">
            {jabatanList.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Pejabat Pelayanan Aktif */}
      {activeTab === "pejabat" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Cari pejabat, no anggota, SK..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            <div>
              <select
                value={selectedLingkup}
                onChange={(e) => setSelectedLingkup(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Lingkup Tugas</option>
                <option value="JEMAAT">Lingkup Jemaat</option>
                <option value="KELOMPOK">Lingkup Kelompok</option>
                <option value="PELKA">Lingkup Pelka</option>
              </select>
            </div>

            <div>
              <select
                value={selectedJabatanId}
                onChange={(e) => setSelectedJabatanId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Jabatan</option>
                {jabatanList.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nama_jabatan} ({j.jenis})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase">
                  <tr>
                    <th className="py-3 px-4">Nama Pejabat</th>
                    <th className="py-3 px-4">Jabatan & Jenis</th>
                    <th className="py-3 px-4">Lingkup Penugasan</th>
                    <th className="py-3 px-4">Periode Masa Bakti</th>
                    <th className="py-3 px-4">Keterangan / SK</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        <span>Memuat data pejabat pelayanan...</span>
                      </td>
                    </tr>
                  ) : filteredPejabat.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Tidak ada data pejabat pelayanan aktif yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPejabat.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{p.nama_lengkap}</div>
                          <div className="text-xs font-mono text-slate-400">
                            {p.nomor_anggota} &bull; {p.jenis_kelamin === "L" ? "L" : "P"}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800">{p.nama_jabatan}</div>
                          <span
                            className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${
                              p.jenis_jabatan === "FUNGSIONAL"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {p.jenis_jabatan}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-medium">
                            {p.lingkup === "JEMAAT" && "Seluruh Jemaat"}
                            {p.lingkup === "KELOMPOK" && (p.nama_kelompok || "Wilayah Kelompok")}
                            {p.lingkup === "PELKA" && (p.nama_pelka || "Pelayanan Kategorial")}
                          </div>
                          <div className="text-xs text-slate-400">Lingkup: {p.lingkup}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-xs text-slate-800">
                            {p.tanggal_pengangkatan} s/d {p.tanggal_berakhir || "Sekarang"}
                          </div>
                          <div className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                            Aktif Menjabat
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-xs text-slate-600 max-w-xs truncate">
                            {p.keterangan || "-"}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isAdmin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAkhiriPejabat(p)}
                              className="text-xs h-8 px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                              Akhiri Masa Tugas
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Lihat Saja</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Struktur & Daftar Jabatan */}
      {activeTab === "master" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {jabatanList.map((jab) => (
              <div
                key={jab.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        jab.jenis === "FUNGSIONAL"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {jab.jenis}
                    </span>
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Aktif
                    </span>
                  </div>

                  <h3 className="font-semibold text-slate-900 text-base mb-1">
                    {jab.nama_jabatan}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    {jab.deskripsi || "Jabatan Pelayanan GMIST Maranatha Tahuna"}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Pejabat Aktif</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">
                    {jab.jumlah_pejabat_aktif}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Penjelasan Tata Jabatan GMIST */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-800 text-sm">Tata Gereja GMIST tentang Pelayan Khusus</h4>
            <p>
              1. <strong>Jabatan Fungsional (Pelayan Khusus)</strong>: Terdiri atas <strong>Penatua</strong> dan <strong>Diaken</strong> yang diteguhkan melalui ibadah peneguhan Pelayan Khusus untuk periode pelayanan gerejawi.
            </p>
            <p>
              2. <strong>Jabatan Struktural</strong>: Terdiri atas <strong>Badan Pengurus Pelka</strong> (Ketua, Wakil Ketua, Sekretaris, Bendahara) di tingkat Jemaat/Kelompok, serta <strong>Koordinator/Ketua Kelompok</strong> yang memimpin persekutuan ibadah rumah tangga.
            </p>
          </div>
        </div>
      )}

      {/* Pengangkatan Dialog */}
      <PengangkatanJabatanDialog
        isOpen={isPengangkatanOpen}
        onClose={() => setIsPengangkatanOpen(false)}
        onSuccess={() => {
          loadData();
        }}
        jabatanList={jabatanList}
      />

      {/* Akhiri Jabatan Dialog */}
      <AkhiriJabatanDialog
        isOpen={!!selectedAkhiriPejabat}
        onClose={() => setSelectedAkhiriPejabat(null)}
        pejabat={selectedAkhiriPejabat}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
