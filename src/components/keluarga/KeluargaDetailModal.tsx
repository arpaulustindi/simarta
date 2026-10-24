"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { invokeCommand } from "@/lib/tauri";
import { KeluargaDetail, JemaatBriefItem, AddAnggotaInput } from "@/types";
import {
  Home,
  UserPlus,
  Trash2,
  Search,
  Loader2,
  Calendar,
  MapPin,
  CheckCircle,
  AlertTriangle,
  User,
} from "lucide-react";

interface KeluargaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  keluarga: KeluargaDetail | null;
  onRefresh: (id: string) => Promise<void>;
  token: string;
  isAdmin?: boolean;
}

export function KeluargaDetailModal({
  isOpen,
  onClose,
  keluarga,
  onRefresh,
  token,
  isAdmin = false,
}: KeluargaDetailModalProps) {
  // Add member states
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<JemaatBriefItem[]>([]);
  const [selectedJemaat, setSelectedJemaat] = useState<JemaatBriefItem | null>(null);
  const [hubungan, setHubungan] = useState("ANAK");
  const [tanggalMulai, setTanggalMulai] = useState(new Date().toISOString().split("T")[0]);
  const [memberNotes, setMemberNotes] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Remove member states
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);

  if (!keluarga) return null;

  const handleSearchMember = async (q: string) => {
    setMemberSearch(q);
    if (!q.trim() || q.trim().length < 2) {
      setMemberResults([]);
      return;
    }
    try {
      setIsSearching(true);
      const res = await invokeCommand<JemaatBriefItem[]>("search_jemaat_brief", {
        token,
        query: q.trim(),
      });
      // Filter out those already in this keluarga
      const existingIds = new Set(keluarga.anggota.map((a) => a.jemaat_id));
      setMemberResults(res.filter((r) => !existingIds.has(r.id)));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJemaat) {
      setAddError("Silakan pilih warga jemaat terlebih dahulu");
      return;
    }
    try {
      setIsAdding(true);
      setAddError(null);
      const input: AddAnggotaInput = {
        keluarga_id: keluarga.id,
        jemaat_id: selectedJemaat.id,
        hubungan_keluarga: hubungan,
        tanggal_mulai: tanggalMulai,
        catatan: memberNotes || undefined,
      };
      await invokeCommand("add_anggota_keluarga", { token, input });
      setShowAddMember(false);
      setSelectedJemaat(null);
      setMemberSearch("");
      setMemberResults([]);
      await onRefresh(keluarga.id);
    } catch (err: any) {
      setAddError(err.message || String(err));
    } finally {
      setIsAdding(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!removeTargetId) return;
    if (!removeReason.trim()) {
      alert("Alasan penghapusan anggota keluarga wajib diisi");
      return;
    }
    try {
      setIsRemoving(true);
      await invokeCommand("remove_anggota_keluarga", {
        token,
        id: removeTargetId,
        reason: removeReason.trim(),
      });
      setRemoveTargetId(null);
      setRemoveReason("");
      await onRefresh(keluarga.id);
    } catch (err: any) {
      alert(`Gagal menghapus anggota: ${err.message || err}`);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={keluarga.nama_keluarga}
      description={`No. KK: ${keluarga.nomor_keluarga} • Status: ${keluarga.status}`}
      maxWidth="4xl"
    >
      <div className="space-y-5 text-xs">
        {/* KK Summary Header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-muted/20 border rounded-lg">
          <div>
            <span className="text-[11px] text-muted-foreground block">Kepala Keluarga:</span>
            <span className="font-semibold text-foreground text-sm">
              {keluarga.kepala_keluarga_nama || <span className="text-muted-foreground italic">Belum Ditentukan</span>}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-muted-foreground block">Alamat Rumah:</span>
            <span className="font-medium text-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
              {keluarga.alamat || "Alamat belum diisi"}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-muted-foreground block">Jumlah Anggota:</span>
            <span className="font-bold text-foreground">
              {keluarga.anggota.length} orang
            </span>
            {keluarga.tanggal_pembentukan && (
              <span className="text-[10px] text-muted-foreground block">
                Sejak: {keluarga.tanggal_pembentukan}
              </span>
            )}
          </div>
        </div>

        {/* Members Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold uppercase tracking-wider text-muted-foreground">
              Daftar Anggota Keluarga ({keluarga.anggota.length})
            </h3>

            {isAdmin && !showAddMember && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddMember(true)}
                className="h-7 text-xs flex items-center gap-1"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Tambah Anggota
              </Button>
            )}
          </div>

          {/* Add Member Form Section */}
          {showAddMember && (
            <form onSubmit={handleAddMember} className="border rounded-lg p-3.5 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
              <div className="flex items-center justify-between font-semibold text-blue-900 dark:text-blue-300">
                <span>Tambah Anggota ke Kartu Keluarga</span>
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Batal
                </button>
              </div>

              {addError && (
                <div className="p-2 text-red-700 bg-red-100 rounded text-xs flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              {/* Jemaat Search */}
              <div className="space-y-1">
                <label className="font-medium text-foreground">
                  Pilih Warga Jemaat <span className="text-red-500">*</span>
                </label>
                {selectedJemaat ? (
                  <div className="flex items-center justify-between p-2 bg-background border rounded-md">
                    <div>
                      <span className="font-semibold text-foreground">{selectedJemaat.nama_lengkap}</span>
                      <span className="text-muted-foreground ml-2">({selectedJemaat.nomor_anggota})</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-red-600"
                      onClick={() => setSelectedJemaat(null)}
                    >
                      Ganti
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama atau nomor anggota jemaat..."
                      value={memberSearch}
                      onChange={(e) => handleSearchMember(e.target.value)}
                      className="pl-8 text-xs"
                    />
                  </div>
                )}

                {isSearching && (
                  <p className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Mencari...
                  </p>
                )}

                {!selectedJemaat && memberResults.length > 0 && (
                  <div className="border rounded bg-card max-h-36 overflow-y-auto divide-y shadow-sm">
                    {memberResults.map((j) => (
                      <div
                        key={j.id}
                        onClick={() => {
                          setSelectedJemaat(j);
                          setMemberResults([]);
                          setMemberSearch("");
                        }}
                        className="p-2 hover:bg-accent cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <span className="font-medium">{j.nama_lengkap}</span>
                          <span className="text-muted-foreground ml-2">({j.nomor_anggota})</span>
                        </div>
                        <span className="text-muted-foreground">{j.nama_pelka || j.jenis_kelamin}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground">Hubungan Keluarga</label>
                  <select
                    value={hubungan}
                    onChange={(e) => setHubungan(e.target.value)}
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="KEPALA_KELUARGA">Kepala Keluarga</option>
                    <option value="SUAMI">Suami</option>
                    <option value="ISTRI">Istri</option>
                    <option value="ANAK">Anak</option>
                    <option value="ORANG_TUA">Orang Tua</option>
                    <option value="MERTUA">Mertua</option>
                    <option value="FAMILI_LAIN">Famili Lain</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-foreground">Tanggal Mulai Terdaftar</label>
                  <Input
                    type="date"
                    value={tanggalMulai}
                    onChange={(e) => setTanggalMulai(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMember(false)}
                >
                  Batal
                </Button>
                <Button type="submit" size="sm" disabled={isAdding || !selectedJemaat}>
                  {isAdding ? "Menambahkan..." : "Simpan Anggota"}
                </Button>
              </div>
            </form>
          )}

          {/* Members Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                  <th className="py-2.5 px-3">No. Anggota</th>
                  <th className="py-2.5 px-3">Nama Lengkap</th>
                  <th className="py-2.5 px-3">Hubungan</th>
                  <th className="py-2.5 px-3">JK / Tgl Lahir</th>
                  <th className="py-2.5 px-3">Pelka</th>
                  <th className="py-2.5 px-3">Kelompok</th>
                  {isAdmin && <th className="py-2.5 px-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {keluarga.anggota.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground italic">
                      Belum ada anggota keluarga yang terdaftar.
                    </td>
                  </tr>
                ) : (
                  keluarga.anggota.map((a) => (
                    <tr key={a.id} className="hover:bg-muted/20">
                      <td className="py-2.5 px-3 font-mono">{a.nomor_anggota}</td>
                      <td className="py-2.5 px-3 font-semibold text-foreground">{a.nama_lengkap}</td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={a.hubungan_keluarga === "KEPALA_KELUARGA" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {a.hubungan_keluarga.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {a.jenis_kelamin} • {a.tanggal_lahir}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{a.nama_pelka || "-"}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{a.nama_kelompok || "-"}</td>
                      {isAdmin && (
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Hapus dari Kartu Keluarga"
                            onClick={() => setRemoveTargetId(a.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t pt-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>

      {/* Remove Member Confirmation Modal */}
      <Modal
        isOpen={Boolean(removeTargetId)}
        onClose={() => {
          setRemoveTargetId(null);
          setRemoveReason("");
        }}
        title="Hapus Anggota Keluarga"
        description="Warga jemaat akan dikeluarkan dari susunan kartu keluarga ini."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-foreground">
              Alasan Penghapusan (Wajib dicatat di Audit Log) <span className="text-red-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: Menikah dan membentuk KK baru / koreksi administrasi"
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRemoveTargetId(null);
                setRemoveReason("");
              }}
              disabled={isRemoving}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmRemove}
              disabled={isRemoving}
            >
              {isRemoving ? "Menghapus..." : "Hapus Anggota"}
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}
