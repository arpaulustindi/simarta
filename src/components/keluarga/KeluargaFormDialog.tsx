"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { invokeCommand } from "@/lib/tauri";
import { KeluargaDetail, KeluargaInput, JemaatBriefItem } from "@/types";
import { Search, Loader2, AlertTriangle, UserCheck } from "lucide-react";

interface KeluargaFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
  editData?: KeluargaDetail | null;
}

export function KeluargaFormDialog({
  isOpen,
  onClose,
  onSuccess,
  token,
  editData,
}: KeluargaFormDialogProps) {
  const isEditing = Boolean(editData);

  const [formData, setFormData] = useState<KeluargaInput>({
    nomor_keluarga: "",
    nama_keluarga: "",
    kepala_keluarga_id: "",
    alamat: "",
    catatan: "",
    tanggal_pembentukan: new Date().toISOString().split("T")[0],
    status: "AKTIF",
  });

  const [editReason, setEditReason] = useState("");
  const [kepalaSearch, setKepalaSearch] = useState("");
  const [kepalaSearchResults, setKepalaSearchResults] = useState<JemaatBriefItem[]>([]);
  const [selectedKepalaName, setSelectedKepalaName] = useState<string | null>(null);
  const [isSearchingKepala, setIsSearchingKepala] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (editData) {
      setFormData({
        nomor_keluarga: editData.nomor_keluarga,
        nama_keluarga: editData.nama_keluarga,
        kepala_keluarga_id: editData.kepala_keluarga_id || "",
        alamat: editData.alamat || "",
        catatan: editData.catatan || "",
        tanggal_pembentukan: editData.tanggal_pembentukan || "",
        status: editData.status,
      });
      setSelectedKepalaName(editData.kepala_keluarga_nama || null);
      setEditReason("");
    } else {
      setFormData({
        nomor_keluarga: "",
        nama_keluarga: "",
        kepala_keluarga_id: "",
        alamat: "",
        catatan: "",
        tanggal_pembentukan: new Date().toISOString().split("T")[0],
        status: "AKTIF",
      });
      setSelectedKepalaName(null);
      setEditReason("");
    }
    setKepalaSearch("");
    setKepalaSearchResults([]);
    setErrorMsg(null);
  }, [editData, isOpen]);

  // Live search for kepala keluarga
  useEffect(() => {
    if (!kepalaSearch.trim() || kepalaSearch.trim().length < 2) {
      setKepalaSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearchingKepala(true);
        const results = await invokeCommand<JemaatBriefItem[]>("search_jemaat_brief", {
          token,
          query: kepalaSearch.trim(),
        });
        setKepalaSearchResults(results);
      } catch (err) {
        console.error("Gagal mencari jemaat:", err);
      } finally {
        setIsSearchingKepala(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [kepalaSearch, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.nama_keluarga.trim()) {
      setErrorMsg("Nama keluarga wajib diisi (Contoh: Keluarga Sasundu - Tatengkeng)");
      return;
    }
    if (isEditing && !editReason.trim()) {
      setErrorMsg("Alasan perubahan data keluarga wajib diisi untuk catatan riwayat audit");
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing && editData) {
        await invokeCommand("update_keluarga", {
          token,
          id: editData.id,
          input: formData,
          reason: editReason.trim(),
        });
      } else {
        await invokeCommand("create_keluarga", {
          token,
          input: formData,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Ubah Kartu Keluarga: ${editData?.nama_keluarga}` : "Buat Kartu Keluarga Baru"}
      description="Pendaftaran kartu keluarga dan penentuan kepala keluarga untuk GMIST Maranatha Tahuna."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 text-red-700 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div>
          <label className="font-medium text-foreground">
            Nama Keluarga <span className="text-red-500">*</span>
          </label>
          <Input
            required
            placeholder="Contoh: Keluarga Gaghana - Sasundu"
            value={formData.nama_keluarga}
            onChange={(e) => setFormData({ ...formData, nama_keluarga: e.target.value })}
            className="mt-1"
          />
        </div>

        <div>
          <label className="font-medium text-foreground">Nomor Kartu Keluarga (Opsional)</label>
          <Input
            placeholder="Kosongkan untuk nomor otomatis (KK-2026-XXXX)"
            value={formData.nomor_keluarga || ""}
            onChange={(e) => setFormData({ ...formData, nomor_keluarga: e.target.value })}
            className="mt-1 font-mono"
          />
        </div>

        {/* Kepala Keluarga Picker */}
        <div className="space-y-1.5 border rounded-lg p-3 bg-muted/20">
          <label className="font-semibold text-foreground flex items-center justify-between">
            <span>Kepala Keluarga</span>
            {selectedKepalaName && (
              <span className="text-blue-600 font-normal">
                Terpilih: <strong>{selectedKepalaName}</strong>
              </span>
            )}
          </label>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Ketik nama jemaat untuk mencari Kepala Keluarga..."
              value={kepalaSearch}
              onChange={(e) => setKepalaSearch(e.target.value)}
              className="pl-8 text-xs"
            />
          </div>

          {isSearchingKepala && (
            <p className="text-[11px] text-muted-foreground italic flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Mencari data jemaat...
            </p>
          )}

          {kepalaSearchResults.length > 0 && (
            <div className="border rounded-md bg-card max-h-40 overflow-y-auto divide-y shadow-sm">
              {kepalaSearchResults.map((j) => (
                <div
                  key={j.id}
                  onClick={() => {
                    setFormData({ ...formData, kepala_keluarga_id: j.id });
                    setSelectedKepalaName(j.nama_lengkap);
                    setKepalaSearch("");
                    setKepalaSearchResults([]);
                  }}
                  className="p-2 hover:bg-accent cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium text-foreground">{j.nama_lengkap}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">({j.nomor_anggota})</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{j.nama_pelka || j.jenis_kelamin}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-medium text-foreground">Tanggal Pembentukan KK</label>
            <Input
              type="date"
              value={formData.tanggal_pembentukan || ""}
              onChange={(e) => setFormData({ ...formData, tanggal_pembentukan: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="font-medium text-foreground">Status Kartu Keluarga</label>
            <select
              value={formData.status || "AKTIF"}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="AKTIF">Aktif</option>
              <option value="PINDAH">Pindah Domisili</option>
              <option value="NONAKTIF">Non-Aktif</option>
            </select>
          </div>
        </div>

        <div>
          <label className="font-medium text-foreground">Alamat Tempat Tinggal</label>
          <Input
            placeholder="Jalan / Lingkungan / RT / Kelurahan"
            value={formData.alamat || ""}
            onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
            className="mt-1"
          />
        </div>

        <div>
          <label className="font-medium text-foreground">Catatan Tambahan</label>
          <Input
            placeholder="Catatan keluarga..."
            value={formData.catatan || ""}
            onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
            className="mt-1"
          />
        </div>

        {isEditing && (
          <div className="border-t pt-3">
            <label className="font-semibold text-foreground">
              Alasan Pembaruan (Wajib dicatat di Audit Log) <span className="text-red-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: Pembaruan alamat atau pergantian kepala keluarga"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              className="mt-1"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t pt-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Buat Kartu Keluarga"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
