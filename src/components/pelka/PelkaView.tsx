"use client";

import React, { useState, useEffect, useCallback } from "react";
import { invokeCommand } from "@/lib/tauri";
import { useAuth, getAuthToken } from "@/lib/auth-context";
import { PelkaSummaryItem, PelkaReviewItem } from "@/types";
import { PelkaMutationDialog } from "./PelkaMutationDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Sparkles,
  ArrowRightLeft,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Info,
  Calendar,
  Layers,
  Edit,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";

export function PelkaView() {
  const { user, token: ctxToken } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const token = ctxToken || getAuthToken();

  const [activeTab, setActiveTab] = useState<"kategori" | "antrean">("kategori");
  const [summaryList, setSummaryList] = useState<PelkaSummaryItem[]>([]);
  const [reviewQueue, setReviewQueue] = useState<PelkaReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search filter for queue
  const [queueSearch, setQueueSearch] = useState("");

  // Mutation Dialog state
  const [selectedMutationItem, setSelectedMutationItem] = useState<PelkaReviewItem | null>(null);

  // Edit Pelka modal state
  const [editingPelka, setEditingPelka] = useState<PelkaSummaryItem | null>(null);
  const [pelkaNama, setPelkaNama] = useState("");
  const [pelkaDeskripsi, setPelkaDeskripsi] = useState("");
  const [isSavingPelka, setIsSavingPelka] = useState(false);
  const [editPelkaError, setEditPelkaError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);

      const [summaryRes, queueRes] = await Promise.all([
        invokeCommand<PelkaSummaryItem[]>("list_pelka_summary", { token }),
        invokeCommand<PelkaReviewItem[]>("get_pelka_review_queue", { token }),
      ]);

      setSummaryList(summaryRes);
      setReviewQueue(queueRes);
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredQueue = reviewQueue.filter((item) => {
    if (!queueSearch.trim()) return true;
    const q = queueSearch.toLowerCase();
    return (
      item.nama_lengkap.toLowerCase().includes(q) ||
      item.nomor_anggota.toLowerCase().includes(q) ||
      (item.nama_kelompok && item.nama_kelompok.toLowerCase().includes(q)) ||
      item.rekomendasi_nama.toLowerCase().includes(q)
    );
  });

  const handleOpenEditPelka = (pelka: PelkaSummaryItem) => {
    setEditingPelka(pelka);
    setPelkaNama(pelka.nama_pelka);
    setPelkaDeskripsi(pelka.deskripsi || "");
    setEditPelkaError(null);
  };

  const handleSavePelka = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPelka) return;
    if (!pelkaNama.trim()) {
      setEditPelkaError("Nama Pelka tidak boleh kosong");
      return;
    }
    try {
      setIsSavingPelka(true);
      setEditPelkaError(null);
      await invokeCommand("update_pelka", {
        token,
        input: {
          id: editingPelka.id,
          nama_pelka: pelkaNama.trim(),
          deskripsi: pelkaDeskripsi.trim() || undefined,
        },
      });
      setEditingPelka(null);
      await loadData();
    } catch (err: any) {
      setEditPelkaError(err.message || String(err));
    } finally {
      setIsSavingPelka(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Pelayanan Kategorial (Pelka)
          </h1>
          <p className="text-sm text-slate-500">
            6 Unit Pelayanan Kategorial GMIST Maranatha Tahuna & Penyesuaian Kategori Usia Jemaat
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          onClick={() => setActiveTab("kategori")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "kategori"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Kategori Pelka</span>
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 font-mono">
            {summaryList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("antrean")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "antrean"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Penyesuaian Kategori Usia Jemaat</span>
          {reviewQueue.length > 0 ? (
            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 font-bold animate-pulse font-mono">
              {reviewQueue.length} Perlu Penyesuaian
            </span>
          ) : (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 font-mono">
              0
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Kategori Pelka */}
      {activeTab === "kategori" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaryList.map((pelka) => {
              const diff = pelka.jumlah_rekomendasi - pelka.jumlah_anggota_aktual;
              const hasDiff = diff !== 0;

              return (
                <div
                  key={pelka.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {pelka.kode}
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditPelka(pelka)}
                            className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded"
                            title="Ubah Keterangan Pelka"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {hasDiff ? (
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {diff > 0 ? `+${diff} perlu penyesuaian` : `${diff} selisih`}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Sesuai
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-slate-900 text-base mb-1">
                      {pelka.nama_pelka}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      {pelka.deskripsi || "Kategori Pelayanan Kategorial GMIST"}
                    </p>

                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <div className="text-[11px] text-slate-500">Anggota Terdaftar</div>
                        <div className="text-xl font-bold text-slate-900 font-mono">
                          {pelka.jumlah_anggota_aktual}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-blue-500" /> Kriteria Usia
                        </div>
                        <div className="text-xl font-bold text-blue-600 font-mono">
                          {pelka.jumlah_rekomendasi}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>Target Usia: Sesuai Tata Gereja</span>
                    <button
                      onClick={() => setActiveTab("antrean")}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Lihat Penyesuaian &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pedoman Aturan Pelka Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-700 space-y-3">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              Pedoman Rekomendasi Pelka GMIST Berdasarkan Usia & Status Perkawinan
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-600">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 block mb-0.5">Pelka Anak (ANAK)</span>
                Usia 0 - 11 tahun (sebelum 12 tahun).
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 block mb-0.5">Pelka Remaja (REMAJA)</span>
                Usia 12 - 16 tahun (sebelum 17 tahun).
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 block mb-0.5">Pelka Pemuda (PEMUDA)</span>
                Usia 17 - 29 tahun dan belum menikah.
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 block mb-0.5">Pelka Pria Kaum Bapa (PKB)</span>
                Laki-laki yang sudah menikah, ATAU laki-laki berusia ≥ 30 tahun.
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 block mb-0.5">Pelka Wanita Kaum Ibu (WKI)</span>
                Perempuan yang sudah menikah, ATAU perempuan berusia ≥ 30 tahun.
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 block mb-0.5">Pelka Lanjut Usia (LANSIA)</span>
                Jemaat berusia ≥ 60 tahun (pria maupun wanita).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Antrean Tinjauan Rekomendasi */}
      {activeTab === "antrean" && (
        <div className="space-y-4">
          {/* Strict Offline Rule Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <span className="font-bold block text-sm mb-0.5">
                Prinsip Rekomendasi: &quot;Suggestion Only, Never Automatic&quot;
              </span>
              Perhitungan Pelka di bawah dihasilkan oleh mesin rekomendasi usia dan status perkawinan murni.
              Sistem <strong>TIDAK PERNAH memutasi Pelka jemaat secara otomatis</strong>. Setiap perpindahan Pelka
              memerlukan persetujuan dan verifikasi eksplisit dari Administrator serta dicatat dalam riwayat audit log.
            </div>
          </div>

          {/* Filter Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Cari nama jemaat, nomor anggota..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <div className="text-xs text-slate-500">
              Ditemukan <span className="font-semibold text-slate-800">{filteredQueue.length}</span> jemaat yang membutuhkan tinjauan
            </div>
          </div>

          {/* Table Queue */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase">
                  <tr>
                    <th className="py-3 px-4">Jemaat</th>
                    <th className="py-3 px-4">Usia / JK</th>
                    <th className="py-3 px-4">Status & Kelompok</th>
                    <th className="py-3 px-4">Pelka Saat Ini</th>
                    <th className="py-3 px-4">Saran Rekomendasi Sistem</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        <span>Menganalisis data jemaat & rekomendasi Pelka...</span>
                      </td>
                    </tr>
                  ) : filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                        <div className="font-medium text-slate-800">
                          Semua Pelka Jemaat Sudah Sesuai
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Tidak ada perbedaan antara Pelka aktual jemaat dan rekomendasi sistem saat ini.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((item) => (
                      <tr key={item.jemaat_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{item.nama_lengkap}</div>
                          <div className="text-xs font-mono text-slate-400">{item.nomor_anggota}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800">{item.usia} Tahun</div>
                          <div className="text-xs text-slate-400">
                            {item.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-700">{item.status_perkawinan.replace("_", " ")}</div>
                          <div className="text-xs text-slate-400">{item.nama_kelompok || "Tanpa Kelompok"}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          {item.pelka_aktual_nama ? (
                            <Badge variant="outline" className="text-slate-700 border-slate-300">
                              {item.pelka_aktual_nama}
                            </Badge>
                          ) : (
                            <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Belum Ditentukan
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-semibold text-blue-700">
                            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                            <span>{item.rekomendasi_nama}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {item.alasan_rekomendasi}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isAdmin ? (
                            <Button
                              size="sm"
                              onClick={() => setSelectedMutationItem(item)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3"
                            >
                              Tinjau & Setujui
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200 text-xs">
                              Hanya Admin
                            </Badge>
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

      {/* Edit Pelka Modal */}
      <Modal
        isOpen={Boolean(editingPelka)}
        onClose={() => setEditingPelka(null)}
        title={`Ubah Pelka: ${editingPelka?.nama_pelka} (${editingPelka?.kode})`}
        description="Perbarui informasi dan deskripsi unit pelayanan kategorial GMIST."
        maxWidth="lg"
      >
        <form onSubmit={handleSavePelka} className="space-y-4 text-xs">
          {editPelkaError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{editPelkaError}</span>
            </div>
          )}

          <div>
            <label className="font-semibold text-foreground">
              Nama Pelayanan Kategorial <span className="text-red-500">*</span>
            </label>
            <Input
              required
              value={pelkaNama}
              onChange={(e) => setPelkaNama(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground">Deskripsi / Sasaran Pelayanan</label>
            <Input
              value={pelkaDeskripsi}
              onChange={(e) => setPelkaDeskripsi(e.target.value)}
              placeholder="Contoh: Kategori Pelayanan Kategorial Remaja Usia 12-16 Tahun"
              className="mt-1 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingPelka(null)}
              disabled={isSavingPelka}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-24"
              disabled={isSavingPelka}
            >
              {isSavingPelka ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Mutation Approval Modal */}
      <PelkaMutationDialog
        isOpen={Boolean(selectedMutationItem)}
        onClose={() => setSelectedMutationItem(null)}
        item={selectedMutationItem}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
