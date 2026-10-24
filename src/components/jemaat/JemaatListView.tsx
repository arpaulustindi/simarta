"use client";

import React, { useState, useEffect, useCallback } from "react";
import { invokeCommand } from "@/lib/tauri";
import { useAuth, getAuthToken } from "@/lib/auth-context";
import {
  JemaatListItem,
  JemaatDetail,
  JemaatPaginationResult,
  JemaatFormOptions,
  JemaatFilter,
} from "@/types";
import { JemaatFormDialog } from "./JemaatFormDialog";
import { JemaatDetailModal } from "./JemaatDetailModal";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit,
  Archive,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export function JemaatListView() {
  const { user, token: ctxToken } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const token = ctxToken || getAuthToken();

  // Data states
  const [data, setData] = useState<JemaatPaginationResult>({
    items: [],
    total: 0,
    page: 1,
    page_size: 15,
    total_pages: 1,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form options (Pelka & Kelompok)
  const [formOptions, setFormOptions] = useState<JemaatFormOptions>({
    pelka_options: [],
    kelompok_options: [],
  });

  // Filter states
  const [search, setSearch] = useState("");
  const [selectedPelka, setSelectedPelka] = useState("");
  const [selectedKelompok, setSelectedKelompok] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("AKTIF");
  const [selectedGender, setSelectedGender] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);

  // Dialog & Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editDetail, setEditDetail] = useState<JemaatDetail | null>(null);
  const [viewDetail, setViewDetail] = useState<JemaatDetail | null>(null);

  // Archive Modal states
  const [archiveTarget, setArchiveTarget] = useState<JemaatListItem | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [isArchiving, setIsArchiving] = useState(false);

  // Fetch form options
  useEffect(() => {
    async function loadOptions() {
      try {
        const opts = await invokeCommand<JemaatFormOptions>("get_jemaat_form_options", { token });
        setFormOptions(opts);
      } catch (err) {
        console.error("Gagal mengambil opsi form:", err);
      }
    }
    loadOptions();
  }, [token]);

  // Fetch jemaat list
  const fetchJemaat = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const filter: JemaatFilter = {
        search: search.trim() || undefined,
        pelka_id: selectedPelka || undefined,
        kelompok_id: selectedKelompok || undefined,
        status_keanggotaan: selectedStatus || undefined,
        jenis_kelamin: selectedGender || undefined,
        include_archived: includeArchived,
        page,
        page_size: 15,
      };

      const res = await invokeCommand<JemaatPaginationResult>("list_jemaat", {
        token,
        filter,
      });
      setData(res);
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedPelka, selectedKelompok, selectedStatus, selectedGender, includeArchived, page, token]);

  useEffect(() => {
    fetchJemaat();
  }, [fetchJemaat]);

  const handleOpenDetail = async (id: string) => {
    try {
      const detail = await invokeCommand<JemaatDetail>("get_jemaat_detail", { token, id });
      setViewDetail(detail);
    } catch (err: any) {
      alert(`Gagal membuka detail: ${err.message || err}`);
    }
  };

  const handleOpenEdit = async (id: string) => {
    try {
      const detail = await invokeCommand<JemaatDetail>("get_jemaat_detail", { token, id });
      setEditDetail(detail);
      setIsFormOpen(true);
    } catch (err: any) {
      alert(`Gagal mengambil data untuk diubah: ${err.message || err}`);
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;
    if (!archiveReason.trim()) {
      alert("Alasan pengarsipan wajib diisi");
      return;
    }
    try {
      setIsArchiving(true);
      await invokeCommand("archive_jemaat", {
        token,
        id: archiveTarget.id,
        reason: archiveReason.trim(),
      });
      setArchiveTarget(null);
      setArchiveReason("");
      fetchJemaat();
    } catch (err: any) {
      alert(`Gagal mengarsipkan jemaat: ${err.message || err}`);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedPelka("");
    setSelectedKelompok("");
    setSelectedStatus("AKTIF");
    setSelectedGender("");
    setIncludeArchived(false);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Data Warga Jemaat
              </h1>
              <p className="text-xs text-muted-foreground">
                Total {data.total} warga jemaat terdata di GMIST Maranatha Tahuna
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setEditDetail(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Tambah Jemaat Baru</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari Nama, NIK, atau Nomor Anggota..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          {/* Filter Pelka */}
          <div>
            <select
              value={selectedPelka}
              onChange={(e) => {
                setSelectedPelka(e.target.value);
                setPage(1);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Semua Pelka</option>
              {formOptions.pelka_options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kelompok */}
          <div>
            <select
              value={selectedKelompok}
              onChange={(e) => {
                setSelectedKelompok(e.target.value);
                setPage(1);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Semua Kelompok</option>
              {formOptions.kelompok_options.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Semua Status</option>
              <option value="AKTIF">Aktif</option>
              <option value="PINDAH">Pindah</option>
              <option value="MENINGGAL">Meninggal</option>
              <option value="NONAKTIF">Nonaktif</option>
            </select>
          </div>

          {/* Filter Gender */}
          <div>
            <select
              value={selectedGender}
              onChange={(e) => {
                setSelectedGender(e.target.value);
                setPage(1);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Semua Gender</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => {
                setIncludeArchived(e.target.checked);
                setPage(1);
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Tampilkan data yang telah diarsipkan</span>
          </label>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset Filter
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {errorMsg && (
          <div className="p-4 bg-red-50 text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                <th className="py-3 px-4">No. Anggota</th>
                <th className="py-3 px-4">Nama Lengkap & NIK</th>
                <th className="py-3 px-4">JK / Usia</th>
                <th className="py-3 px-4">Kelompok</th>
                <th className="py-3 px-4">Pelka Aktual vs Saran</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Memuat data jemaat...</span>
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium">Tidak ada data jemaat yang sesuai.</p>
                    <p className="text-[11px] mt-0.5">Coba ubah kata kunci pencarian atau reset filter.</p>
                  </td>
                </tr>
              ) : (
                data.items.map((j) => {
                  const isMismatch =
                    j.kode_pelka &&
                    j.pelka_recommendation?.kode &&
                    j.pelka_recommendation.kode !== "TIDAK_DAPAT_DITENTUKAN" &&
                    j.pelka_recommendation.kode !== "BELUM_DITENTUKAN" &&
                    j.kode_pelka !== j.pelka_recommendation.kode;

                  return (
                    <tr
                      key={j.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => handleOpenDetail(j.id)}
                    >
                      <td className="py-3 px-4 font-mono font-medium text-foreground">
                        {j.nomor_anggota}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground group-hover:text-blue-600 transition-colors">
                          {j.nama_lengkap}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">
                          {j.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {j.pelka_recommendation.usia !== undefined
                            ? `${j.pelka_recommendation.usia} thn (${j.tanggal_lahir})`
                            : j.tanggal_lahir}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-medium text-foreground">
                        {j.nama_kelompok || <span className="text-muted-foreground italic">-</span>}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="font-medium text-foreground">
                            {j.nama_pelka || <span className="text-muted-foreground italic">Belum Ada</span>}
                          </span>
                          {isMismatch && (
                            <span
                              title={`Saran sistem: ${j.pelka_recommendation.nama_pelka} (${j.pelka_recommendation.alasan})`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-medium"
                            >
                              <Sparkles className="h-3 w-3 shrink-0" />
                              <span>Saran: {j.pelka_recommendation.kode}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            j.is_archived
                              ? "destructive"
                              : j.status_keanggotaan === "AKTIF"
                              ? "default"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {j.is_archived ? "ARSIP" : j.status_keanggotaan}
                        </Badge>
                      </td>

                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Lihat Detail Lengkap"
                            onClick={() => handleOpenDetail(j.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {isAdmin && !j.is_archived && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                                title="Ubah Data Jemaat"
                                onClick={() => handleOpenEdit(j.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                                title="Arsipkan Jemaat"
                                onClick={() => setArchiveTarget(j)}
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/20 text-xs">
          <span className="text-muted-foreground">
            Menampilkan halaman <strong>{data.page}</strong> dari <strong>{data.total_pages}</strong> ({data.total} total)
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 text-xs"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.total_pages || isLoading}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 text-xs"
            >
              Selanjutnya
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      <JemaatFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditDetail(null);
        }}
        onSuccess={fetchJemaat}
        token={token}
        editData={editDetail}
      />

      {/* Detail Modal */}
      <JemaatDetailModal
        isOpen={Boolean(viewDetail)}
        onClose={() => setViewDetail(null)}
        jemaat={viewDetail}
        onEdit={() => {
          const toEdit = viewDetail;
          setViewDetail(null);
          if (toEdit) setEditDetail(toEdit);
          setIsFormOpen(true);
        }}
        isAdmin={isAdmin}
      />

      {/* Archive Confirmation Dialog */}
      <Modal
        isOpen={Boolean(archiveTarget)}
        onClose={() => {
          setArchiveTarget(null);
          setArchiveReason("");
        }}
        title="Konfirmasi Pengarsipan Data Jemaat"
        description="Data yang diarsipkan tidak akan muncul di daftar aktif, namun riwayat audit tetap terjaga."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              Anda akan mengarsipkan data jemaat: <strong>{archiveTarget?.nama_lengkap}</strong> ({archiveTarget?.nomor_anggota}).
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">
              Alasan Pengarsipan <span className="text-red-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: Pindah domisili permanen / meninggal dunia"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setArchiveTarget(null);
                setArchiveReason("");
              }}
              disabled={isArchiving}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmArchive}
              disabled={isArchiving}
            >
              {isArchiving ? "Mengarsipkan..." : "Arsipkan Jemaat"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
