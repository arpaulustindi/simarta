"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { calculatePelkaRecommendation } from "@/lib/pelka";
import { invokeCommand } from "@/lib/tauri";
import {
  JemaatDetail,
  JemaatInput,
  JemaatFormOptions,
  DuplicateCheckResult,
} from "@/types";
import {
  Sparkles,
  AlertTriangle,
  Info,
  CheckCircle2,
  Loader2,
  Calendar,
} from "lucide-react";

const DAFTAR_PENDIDIKAN = [
  "Tidak / Belum Sekolah",
  "SD / Sederajat",
  "SMP / Sederajat",
  "SMA / SMK / Sederajat",
  "Diploma I / II",
  "Diploma III (D3)",
  "Diploma IV / Sarjana (S1)",
  "Magister (S2)",
  "Doktoral (S3)",
];

const DAFTAR_PEKERJAAN = [
  "PNS / ASN",
  "TNI / POLRI",
  "Guru / Dosen",
  "Pendeta / Rohaniwan",
  "Pegawai BUMN / BUMD",
  "Karyawan Swasta",
  "Wiraswasta / Pedagang",
  "Petani / Pekebun",
  "Nelayan",
  "Buruh Harian Lepas",
  "Pelajar / Mahasiswa",
  "Mengurus Rumah Tangga",
  "Pensiunan",
  "Belum / Tidak Bekerja",
];

interface JemaatFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
  editData?: JemaatDetail | null;
}

export function JemaatFormDialog({
  isOpen,
  onClose,
  onSuccess,
  token,
  editData,
}: JemaatFormDialogProps) {
  const isEditing = Boolean(editData);

  const [formOptions, setFormOptions] = useState<JemaatFormOptions>({
    pelka_options: [],
    kelompok_options: [],
  });

  const [manualPendidikan, setManualPendidikan] = useState(false);
  const [manualPekerjaan, setManualPekerjaan] = useState(false);

  // Form State
  const [formData, setFormData] = useState<JemaatInput>({
    nomor_anggota: "",
    nik: "",
    nama_lengkap: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    jenis_kelamin: "L",
    status_perkawinan: "BELUM_MENIKAH",
    tanggal_menikah: "",
    pendidikan_terakhir: "",
    bidang_ilmu: "",
    pekerjaan: "",
    alamat: "",
    desa_kelurahan: "Tahuna",
    kecamatan: "Tahuna",
    nomor_telepon: "",
    status_keanggotaan: "AKTIF",
    tanggal_masuk: new Date().toISOString().split("T")[0],
    pelka_id: "",
    kelompok_id: "",
  });

  const [editReason, setEditReason] = useState("");
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Form Options (Pelka & Kelompok)
  useEffect(() => {
    async function fetchOptions() {
      try {
        const opts = await invokeCommand<JemaatFormOptions>("get_jemaat_form_options", { token });
        setFormOptions(opts);
      } catch (err) {
        console.error("Gagal mengambil opsi form:", err);
      }
    }
    if (isOpen) {
      fetchOptions();
    }
  }, [isOpen, token]);

  // Reset or Populate on Edit
  useEffect(() => {
    if (editData) {
      const edu = editData.pendidikan_terakhir || "";
      const job = editData.pekerjaan || "";
      setManualPendidikan(Boolean(edu && !DAFTAR_PENDIDIKAN.includes(edu)));
      setManualPekerjaan(Boolean(job && !DAFTAR_PEKERJAAN.includes(job)));

      setFormData({
        nomor_anggota: editData.nomor_anggota,
        nik: editData.nik || "",
        nama_lengkap: editData.nama_lengkap,
        tempat_lahir: editData.tempat_lahir || "",
        tanggal_lahir: editData.tanggal_lahir,
        jenis_kelamin: editData.jenis_kelamin,
        status_perkawinan: editData.status_perkawinan,
        tanggal_menikah: editData.tanggal_menikah || "",
        pendidikan_terakhir: editData.pendidikan_terakhir || "",
        bidang_ilmu: editData.bidang_ilmu || "",
        pekerjaan: editData.pekerjaan || "",
        alamat: editData.alamat || "",
        desa_kelurahan: editData.desa_kelurahan || "Tahuna",
        kecamatan: editData.kecamatan || "Tahuna",
        nomor_telepon: editData.nomor_telepon || "",
        status_keanggotaan: editData.status_keanggotaan,
        tanggal_masuk: editData.tanggal_masuk || "",
        pelka_id: editData.pelka_id || "",
        kelompok_id: editData.kelompok_id || "",
      });
      setEditReason("");
    } else {
      setManualPendidikan(false);
      setManualPekerjaan(false);
      setFormData({
        nomor_anggota: "",
        nik: "",
        nama_lengkap: "",
        tempat_lahir: "",
        tanggal_lahir: "",
        jenis_kelamin: "L",
        status_perkawinan: "BELUM_MENIKAH",
        tanggal_menikah: "",
        pendidikan_terakhir: "",
        bidang_ilmu: "",
        pekerjaan: "",
        alamat: "",
        desa_kelurahan: "Tahuna",
        kecamatan: "Tahuna",
        nomor_telepon: "",
        status_keanggotaan: "AKTIF",
        tanggal_masuk: new Date().toISOString().split("T")[0],
        pelka_id: "",
        kelompok_id: "",
      });
      setEditReason("");
    }
    setDuplicateCheck(null);
    setErrorMsg(null);
  }, [editData, isOpen]);

  // Live Pure Pelka Recommendation Calculation
  const pelkaRecommendation = useMemo(() => {
    if (!formData.tanggal_lahir) return null;
    return calculatePelkaRecommendation(
      formData.tanggal_lahir,
      formData.jenis_kelamin,
      formData.status_perkawinan
    );
  }, [formData.tanggal_lahir, formData.jenis_kelamin, formData.status_perkawinan]);

  // Debounced duplicate check
  useEffect(() => {
    if (!formData.nama_lengkap || !formData.tanggal_lahir) {
      setDuplicateCheck(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingDuplicate(true);
        const res = await invokeCommand<DuplicateCheckResult>("check_jemaat_duplicate", {
          token,
          nik: formData.nik || undefined,
          namaLengkap: formData.nama_lengkap,
          tanggalLahir: formData.tanggal_lahir,
          excludeId: editData?.id,
        });
        setDuplicateCheck(res);
      } catch (err) {
        console.error("Gagal memeriksa duplikasi:", err);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.nik, formData.nama_lengkap, formData.tanggal_lahir, editData?.id, token]);

  const handleChange = (
    field: keyof JemaatInput,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.nama_lengkap.trim()) {
      setErrorMsg("Nama lengkap jemaat wajib diisi");
      return;
    }
    if (!formData.tanggal_lahir.trim()) {
      setErrorMsg("Tanggal lahir jemaat wajib diisi");
      return;
    }
    if (isEditing && !editReason.trim()) {
      setErrorMsg("Alasan perubahan data jemaat wajib diisi untuk catatan riwayat audit");
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing && editData) {
        await invokeCommand("update_jemaat", {
          token,
          id: editData.id,
          input: formData,
          reason: editReason.trim(),
        });
      } else {
        await invokeCommand("create_jemaat", {
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
      title={isEditing ? `Ubah Data: ${editData?.nama_lengkap}` : "Pendaftaran Jemaat Baru"}
      description="Data disimpan secara lokal dengan verifikasi duplikasi dan rekomendasi Pelka otomatis."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Duplicate Warning */}
        {duplicateCheck?.is_duplicate && (
          <div className="flex items-start gap-3 p-3.5 text-sm text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-200 rounded-lg border border-amber-200 dark:border-amber-800 animate-in fade-in">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
            <div className="flex-1">
              <span className="font-semibold block">Peringatan Kemungkinan Duplikasi:</span>
              <p className="text-xs mt-0.5">{duplicateCheck.duplicate_reason}</p>
            </div>
          </div>
        )}

        {/* SECTION 1: Identitas Pokok */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
            Identitas Pokok
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-foreground">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <Input
                required
                placeholder="Contoh: Jonathan Tatengkeng"
                value={formData.nama_lengkap}
                onChange={(e) => handleChange("nama_lengkap", e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Tempat Lahir</label>
              <Input
                placeholder="Contoh: Tahuna"
                value={formData.tempat_lahir || ""}
                onChange={(e) => handleChange("tempat_lahir", e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">
                Tanggal Lahir <span className="text-red-500">*</span>
              </label>
              <Input
                required
                type="date"
                value={formData.tanggal_lahir}
                onChange={(e) => handleChange("tanggal_lahir", e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">
                Jenis Kelamin <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.jenis_kelamin}
                onChange={(e) => handleChange("jenis_kelamin", e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">
                Status Perkawinan <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status_perkawinan}
                onChange={(e) => handleChange("status_perkawinan", e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="BELUM_MENIKAH">Belum Menikah</option>
                <option value="MENIKAH">Menikah</option>
                <option value="CERAI_HIDUP">Cerai Hidup</option>
                <option value="CERAI_MATI">Cerai Mati</option>
              </select>
            </div>

            {formData.status_perkawinan === "MENIKAH" && (
              <div>
                <label className="text-xs font-medium text-foreground">Tanggal Pernikahan</label>
                <Input
                  type="date"
                  value={formData.tanggal_menikah || ""}
                  onChange={(e) => handleChange("tanggal_menikah", e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: LIVE PELKA SUGGESTION BANNER (SACRED RULE) */}
        {pelkaRecommendation && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                  Rekomendasi Pelka (Saran Sistem Murni)
                </span>
              </div>
              {pelkaRecommendation.usia !== undefined && (
                <span className="text-xs font-medium text-blue-800 dark:text-blue-300">
                  Usia Terhitung: <strong>{pelkaRecommendation.usia} tahun</strong>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className="bg-blue-600 text-white hover:bg-blue-700 text-sm px-2.5 py-0.5">
                {pelkaRecommendation.nama_pelka} ({pelkaRecommendation.kode})
              </Badge>
              <span className="text-xs text-muted-foreground italic">
                — {pelkaRecommendation.alasan}
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1 border-t border-blue-100 dark:border-blue-900/60 pt-2">
              <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span>
                Aturan GMIST: Sistem <strong>hanya menyarankan</strong>. Penetapan Pelka Aktual di bawah tetap menjadi keputusan resmi Administrator/Pengurus.
              </span>
            </p>
          </div>
        )}

        {/* SECTION 3: Penempatan Gerejawi (Kelompok & Pelka Aktual) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
            Penempatan Gerejawi
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">
                Pelka Aktual Terdaftar
              </label>
              <select
                value={formData.pelka_id || ""}
                onChange={(e) => handleChange("pelka_id", e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">-- Pilih Pelka Aktual --</option>
                {formOptions.pelka_options.map((p) => {
                  const isRecommended = pelkaRecommendation?.kode === p.code;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.label} {isRecommended ? "⭐ (Saran Sistem)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">
                Kelompok Ibadah Rumah Tangga
              </label>
              <select
                value={formData.kelompok_id || ""}
                onChange={(e) => handleChange("kelompok_id", e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">-- Pilih Kelompok Ibadah --</option>
                {formOptions.kelompok_options.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label} ({k.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">
                Status Keanggotaan
              </label>
              <select
                value={formData.status_keanggotaan || "AKTIF"}
                onChange={(e) => handleChange("status_keanggotaan", e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="AKTIF">Aktif</option>
                <option value="PINDAH">Pindah Keluar</option>
                <option value="MENINGGAL">Meninggal Dunia</option>
                <option value="NONAKTIF">Non-Aktif</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Nomor Telepon / WhatsApp</label>
              <Input
                placeholder="08xxxxxxxxxx"
                value={formData.nomor_telepon || ""}
                onChange={(e) => handleChange("nomor_telepon", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Alamat & Demografi Tambahan */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
            Alamat & Keterangan Tambahan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-foreground">Alamat Domisili</label>
              <Input
                placeholder="Nama jalan, lorong, nomor rumah, RT/RW"
                value={formData.alamat || ""}
                onChange={(e) => handleChange("alamat", e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Pendidikan Terakhir</label>
                <button
                  type="button"
                  onClick={() => {
                    setManualPendidikan(!manualPendidikan);
                    if (!manualPendidikan && !formData.pendidikan_terakhir) {
                      handleChange("pendidikan_terakhir", "");
                    }
                  }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {manualPendidikan ? "Pilih dari Daftar" : "+ Ketik Manual"}
                </button>
              </div>
              {manualPendidikan ? (
                <Input
                  placeholder="Ketik pendidikan (contoh: Sarjana Teologi / STM)"
                  value={formData.pendidikan_terakhir || ""}
                  onChange={(e) => handleChange("pendidikan_terakhir", e.target.value)}
                  className="mt-1"
                  autoFocus
                />
              ) : (
                <select
                  value={formData.pendidikan_terakhir || ""}
                  onChange={(e) => {
                    if (e.target.value === "__MANUAL__") {
                      setManualPendidikan(true);
                      handleChange("pendidikan_terakhir", "");
                    } else {
                      handleChange("pendidikan_terakhir", e.target.value);
                    }
                  }}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Pilih Pendidikan --</option>
                  {DAFTAR_PENDIDIKAN.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  {formData.pendidikan_terakhir && !DAFTAR_PENDIDIKAN.includes(formData.pendidikan_terakhir) && (
                    <option value={formData.pendidikan_terakhir}>
                      {formData.pendidikan_terakhir} (Tersimpan)
                    </option>
                  )}
                  <option value="__MANUAL__">+ Tambah / Ketik Manual...</option>
                </select>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Pekerjaan</label>
                <button
                  type="button"
                  onClick={() => {
                    setManualPekerjaan(!manualPekerjaan);
                    if (!manualPekerjaan && !formData.pekerjaan) {
                      handleChange("pekerjaan", "");
                    }
                  }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {manualPekerjaan ? "Pilih dari Daftar" : "+ Ketik Manual"}
                </button>
              </div>
              {manualPekerjaan ? (
                <Input
                  placeholder="Ketik pekerjaan (contoh: Nahkoda / Perawat / Apoteker)"
                  value={formData.pekerjaan || ""}
                  onChange={(e) => handleChange("pekerjaan", e.target.value)}
                  className="mt-1"
                  autoFocus
                />
              ) : (
                <select
                  value={formData.pekerjaan || ""}
                  onChange={(e) => {
                    if (e.target.value === "__MANUAL__") {
                      setManualPekerjaan(true);
                      handleChange("pekerjaan", "");
                    } else {
                      handleChange("pekerjaan", e.target.value);
                    }
                  }}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Pilih Pekerjaan --</option>
                  {DAFTAR_PEKERJAAN.map((pk) => (
                    <option key={pk} value={pk}>
                      {pk}
                    </option>
                  ))}
                  {formData.pekerjaan && !DAFTAR_PEKERJAAN.includes(formData.pekerjaan) && (
                    <option value={formData.pekerjaan}>
                      {formData.pekerjaan} (Tersimpan)
                    </option>
                  )}
                  <option value="__MANUAL__">+ Tambah / Ketik Manual...</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 5: Alasan Perubahan (Khusus Edit untuk Audit Log) */}
        {isEditing && (
          <div className="space-y-2 border-t pt-3">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>Alasan Pembaruan Data (Wajib dicatat di Riwayat Audit)</span>
              <span className="text-red-500">*</span>
            </label>
            <Input
              required
              placeholder="Contoh: Koreksi ejaan nama berdasarkan akta lahir / perubahan alamat baru"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="min-w-28">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : isEditing ? (
              "Simpan Pembaruan"
            ) : (
              "Daftarkan Jemaat"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
