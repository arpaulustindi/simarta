"use client";

import React, { useState, useEffect, useCallback } from "react";
import { invokeCommand } from "@/lib/tauri";
import { useAuth, getAuthToken } from "@/lib/auth-context";
import {
  KelompokListItem,
  KelompokDetail,
  KelompokJemaatItem,
} from "@/types";
import { MoveKelompokDialog } from "./MoveKelompokDialog";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  Users,
  Search,
  ArrowRightLeft,
  Eye,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export function KelompokListView() {
  const { user, token: ctxToken } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const token = ctxToken || getAuthToken();

  const [kelompokList, setKelompokList] = useState<KelompokListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Detail Modal states
  const [selectedKelompokDetail, setSelectedKelompokDetail] = useState<KelompokDetail | null>(null);
  const [detailSearch, setDetailSearch] = useState("");
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Move Kelompok states
  const [moveTarget, setMoveTarget] = useState<KelompokJemaatItem | null>(null);

  // CRUD Kelompok Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingKelompok, setEditingKelompok] = useState<KelompokListItem | null>(null);
  const [formNomor, setFormNomor] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formDeskripsi, setFormDeskripsi] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirm states
  const [deletingKelompok, setDeletingKelompok] = useState<KelompokListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchKelompok = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await invokeCommand<KelompokListItem[]>("list_kelompok", { token });
      setKelompokList(res);
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchKelompok();
  }, [fetchKelompok]);

  const handleOpenKelompokDetail = async (id: string) => {
    try {
      setIsLoadingDetail(true);
      const detail = await invokeCommand<KelompokDetail>("get_kelompok_detail", { token, id });
      setSelectedKelompokDetail(detail);
      setDetailSearch("");
    } catch (err: any) {
      alert(`Gagal mengambil data kelompok: ${err.message || err}`);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const filteredJemaatList = selectedKelompokDetail?.jemaat_list.filter((j) => {
    if (!detailSearch.trim()) return true;
    const q = detailSearch.toLowerCase();
    return (
      j.nama_lengkap.toLowerCase().includes(q) ||
      j.nomor_anggota.toLowerCase().includes(q) ||
      (j.nama_pelka && j.nama_pelka.toLowerCase().includes(q))
    );
  }) || [];

  const handleOpenCreate = () => {
    setEditingKelompok(null);
    setFormNomor("");
    setFormNama("");
    setFormDeskripsi("");
    setFormIsActive(true);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (k: KelompokListItem) => {
    setEditingKelompok(k);
    setFormNomor(k.nomor_kelompok);
    setFormNama(k.nama_kelompok);
    setFormDeskripsi(k.deskripsi || "");
    setFormIsActive(k.is_active);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNomor.trim()) {
      setFormError("Nomor kelompok wajib diisi (contoh: 01, 13)");
      return;
    }
    if (!formNama.trim()) {
      setFormError("Nama kelompok wajib diisi (contoh: Kelompok 13)");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      if (editingKelompok) {
        await invokeCommand("update_kelompok", {
          token,
          input: {
            id: editingKelompok.id,
            nomor_kelompok: formNomor.trim(),
            nama_kelompok: formNama.trim(),
            deskripsi: formDeskripsi.trim() || undefined,
            is_active: formIsActive,
          },
        });
      } else {
        await invokeCommand("create_kelompok", {
          token,
          input: {
            nomor_kelompok: formNomor.trim(),
            nama_kelompok: formNama.trim(),
            deskripsi: formDeskripsi.trim() || undefined,
          },
        });
      }

      setIsFormOpen(false);
      await fetchKelompok();
    } catch (err: any) {
      setFormError(err.message || String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingKelompok) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await invokeCommand("delete_kelompok", {
        token,
        id: deletingKelompok.id,
      });
      setDeletingKelompok(null);
      await fetchKelompok();
    } catch (err: any) {
      setDeleteError(err.message || String(err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Kelompok Ibadah Rumah Tangga
            </h1>
            <p className="text-xs text-muted-foreground">
              Wilayah Kelompok Pelayanan Ibadah GMIST Maranatha Tahuna
            </p>
          </div>
        </div>

        {isAdmin && (
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Kelompok Baru</span>
          </Button>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Kelompok Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin mx-auto mb-2 text-blue-600" />
          <span>Memuat daftar kelompok ibadah...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {kelompokList.map((k) => (
            <div
              key={k.id}
              className="group flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer relative"
              onClick={() => handleOpenKelompokDetail(k.id)}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-mono font-bold text-xs shadow-sm">
                    {k.nomor_kelompok}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={k.is_active ? "outline" : "secondary"} className="text-[10px]">
                      {k.jumlah_jemaat} Jiwa
                    </Badge>
                    {isAdmin && (
                      <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600"
                          title="Ubah Kelompok"
                          onClick={() => handleOpenEdit(k)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                          title="Hapus Kelompok"
                          onClick={() => {
                            setDeletingKelompok(k);
                            setDeleteError(null);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-foreground text-base group-hover:text-blue-600 transition-colors">
                  {k.nama_kelompok}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {k.deskripsi || "Wilayah pelayanan ibadah rumah tangga"}
                </p>
              </div>

              <div className="border-t pt-3 mt-4 flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-medium">
                <span>Daftar Warga Jemaat</span>
                <Eye className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal for Selected Kelompok */}
      <Modal
        isOpen={Boolean(selectedKelompokDetail)}
        onClose={() => setSelectedKelompokDetail(null)}
        title={`${selectedKelompokDetail?.nama_kelompok} (${selectedKelompokDetail?.nomor_kelompok})`}
        description={selectedKelompokDetail?.deskripsi || "Daftar warga jemaat terdaftar di kelompok ibadah ini"}
        maxWidth="4xl"
      >
        <div className="space-y-4 text-xs">
          {/* Search within kelompok */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau nomor anggota dalam kelompok ini..."
                value={detailSearch}
                onChange={(e) => setDetailSearch(e.target.value)}
                className="pl-8 text-xs"
              />
            </div>
            <Badge variant="secondary" className="px-3 py-1 text-xs">
              Total: {selectedKelompokDetail?.jemaat_list.length || 0} Warga
            </Badge>
          </div>

          {/* Members Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                  <th className="py-2.5 px-3">No. Anggota</th>
                  <th className="py-2.5 px-3">Nama Lengkap</th>
                  <th className="py-2.5 px-3">JK / Tgl Lahir</th>
                  <th className="py-2.5 px-3">Pelka Aktual</th>
                  <th className="py-2.5 px-3">Alamat</th>
                  <th className="py-2.5 px-3">No. Telepon</th>
                  {isAdmin && <th className="py-2.5 px-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredJemaatList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground italic">
                      Tidak ada warga jemaat yang ditemukan di kelompok ini.
                    </td>
                  </tr>
                ) : (
                  filteredJemaatList.map((j) => (
                    <tr key={j.id} className="hover:bg-muted/20">
                      <td className="py-2.5 px-3 font-mono font-medium">{j.nomor_anggota}</td>
                      <td className="py-2.5 px-3 font-semibold text-foreground">{j.nama_lengkap}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {j.jenis_kelamin} • {j.tanggal_lahir}
                      </td>
                      <td className="py-2.5 px-3">{j.nama_pelka || "-"}</td>
                      <td className="py-2.5 px-3 text-muted-foreground truncate max-w-40">
                        {j.alamat || "-"}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground font-mono">{j.nomor_telepon || "-"}</td>
                      {isAdmin && (
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700"
                            onClick={() => setMoveTarget(j)}
                            title="Pindahkan ke Kelompok Lain"
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                            <span>Pindah</span>
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => setSelectedKelompokDetail(null)}>
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      {/* Move Kelompok Dialog */}
      {moveTarget && selectedKelompokDetail && (
        <MoveKelompokDialog
          isOpen={Boolean(moveTarget)}
          onClose={() => setMoveTarget(null)}
          onSuccess={async () => {
            setMoveTarget(null);
            await fetchKelompok();
            if (selectedKelompokDetail) {
              await handleOpenKelompokDetail(selectedKelompokDetail.id);
            }
          }}
          token={token}
          jemaatId={moveTarget.id}
          jemaatNama={moveTarget.nama_lengkap}
          currentKelompokId={selectedKelompokDetail.id}
          kelompokList={kelompokList}
        />
      )}

      {/* CRUD Kelompok Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingKelompok ? `Ubah Data: ${editingKelompok.nama_kelompok}` : "Tambah Kelompok Ibadah Baru"}
        description="Kelola unit wilayah persekutuan rumah tangga jemaat GMIST Maranatha Tahuna."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="font-semibold text-foreground">
              Nomor Kelompok <span className="text-red-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: 01, 12, 13"
              value={formNomor}
              onChange={(e) => setFormNomor(e.target.value)}
              className="mt-1 font-mono text-xs"
            />
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Nomor urut kelompok (unik, format 2 digit disarankan)
            </span>
          </div>

          <div>
            <label className="font-semibold text-foreground">
              Nama Kelompok <span className="text-red-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: Kelompok 13"
              value={formNama}
              onChange={(e) => setFormNama(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground">Keterangan / Wilayah Lingkup</label>
            <Input
              placeholder="Contoh: Wilayah Lingkungan Kolongan RT 05"
              value={formDeskripsi}
              onChange={(e) => setFormDeskripsi(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          {editingKelompok && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="kelompok_active"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="kelompok_active" className="text-xs text-foreground cursor-pointer font-medium">
                Kelompok Ibadah Berstatus Aktif
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-24"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : editingKelompok ? (
                "Simpan Perubahan"
              ) : (
                "Tambah Kelompok"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingKelompok)}
        onClose={() => setDeletingKelompok(null)}
        title={`Hapus ${deletingKelompok?.nama_kelompok}?`}
        description="Penghapusan kelompok ibadah secara permanen dari basis data."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          {deleteError ? (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{deleteError}</span>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-semibold block">Perhatian:</span>
                Pastikan kelompok ini sudah tidak memiliki jemaat aktif sebelum dihapus. Aksi ini tidak dapat dibatalkan.
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingKelompok(null)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="min-w-24"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                "Ya, Hapus Kelompok"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
