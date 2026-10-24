"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JemaatListItem, CreatePerkawinanInput } from "@/types";
import { invokeCommand } from "@/lib/tauri";
import { getAuthToken } from "@/lib/auth-context";
import {
  AlertTriangle,
  CheckCircle,
  Heart,
  Loader2,
  Search,
  Sparkles,
  User,
} from "lucide-react";

interface PerkawinanFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PerkawinanFormDialog({
  isOpen,
  onClose,
  onSuccess,
}: PerkawinanFormDialogProps) {
  const token = getAuthToken();

  // Mempelai 1
  const [m1Search, setM1Search] = useState("");
  const [m1Options, setM1Options] = useState<JemaatListItem[]>([]);
  const [isSearchingM1, setIsSearchingM1] = useState(false);
  const [selectedM1, setSelectedM1] = useState<JemaatListItem | null>(null);

  // Pasangan
  const [pasanganType, setPasanganType] = useState<"INTERNAL" | "EXTERNAL">("INTERNAL");

  // Mempelai 2 (Internal)
  const [m2Search, setM2Search] = useState("");
  const [m2Options, setM2Options] = useState<JemaatListItem[]>([]);
  const [isSearchingM2, setIsSearchingM2] = useState(false);
  const [selectedM2, setSelectedM2] = useState<JemaatListItem | null>(null);

  // Pasangan Luar (External)
  const [namaPasanganLuar, setNamaPasanganLuar] = useState("");

  // Perkawinan details
  const [tanggalPerkawinan, setTanggalPerkawinan] = useState("");
  const [tempat, setTempat] = useState("GMIST Maranatha Tahuna");
  const [pelayanFirman, setPelayanFirman] = useState("");
  const [nomorSurat, setNomorSurat] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedM1(null);
      setM1Search("");
      setPasanganType("INTERNAL");
      setSelectedM2(null);
      setM2Search("");
      setNamaPasanganLuar("");
      setTanggalPerkawinan(new Date().toISOString().split("T")[0]);
      setTempat("GMIST Maranatha Tahuna");
      setPelayanFirman("");
      setNomorSurat("");
      setKeterangan("");
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Search Mempelai 1
  useEffect(() => {
    if (!isOpen || selectedM1) return;

    const timer = setTimeout(async () => {
      try {
        setIsSearchingM1(true);
        const res = await invokeCommand<{ items: JemaatListItem[] }>("list_jemaat", {
          token,
          filter: {
            search: m1Search.trim() || undefined,
            status_keanggotaan: "AKTIF",
            include_archived: false,
            page: 1,
            page_size: 15,
          },
        });
        setM1Options(res.items || []);
      } catch (err: any) {
        console.error("Gagal mencari mempelai 1:", err);
      } finally {
        setIsSearchingM1(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [m1Search, isOpen, selectedM1, token]);

  // Search Mempelai 2
  useEffect(() => {
    if (!isOpen || selectedM2 || pasanganType !== "INTERNAL") return;

    const timer = setTimeout(async () => {
      try {
        setIsSearchingM2(true);
        const res = await invokeCommand<{ items: JemaatListItem[] }>("list_jemaat", {
          token,
          filter: {
            search: m2Search.trim() || undefined,
            status_keanggotaan: "AKTIF",
            include_archived: false,
            page: 1,
            page_size: 15,
          },
        });
        // Filter out Mempelai 1
        const filtered = (res.items || []).filter((j) => j.id !== selectedM1?.id);
        setM2Options(filtered);
      } catch (err: any) {
        console.error("Gagal mencari mempelai 2:", err);
      } finally {
        setIsSearchingM2(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [m2Search, isOpen, selectedM2, selectedM1, pasanganType, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedM1) {
      setErrorMsg("Pilih jemaat mempelai pertama");
      return;
    }
    if (pasanganType === "INTERNAL" && !selectedM2) {
      setErrorMsg("Pilih jemaat mempelai kedua (pasangan internal GMIST Maranatha)");
      return;
    }
    if (pasanganType === "EXTERNAL" && !namaPasanganLuar.trim()) {
      setErrorMsg("Masukkan nama lengkap pasangan dari luar jemaat");
      return;
    }
    if (!tanggalPerkawinan) {
      setErrorMsg("Tanggal perkawinan kudus wajib diisi");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const input: CreatePerkawinanInput = {
        mempelai_1_id: selectedM1.id,
        mempelai_2_id: pasanganType === "INTERNAL" ? selectedM2?.id : undefined,
        nama_pasangan_luar: pasanganType === "EXTERNAL" ? namaPasanganLuar.trim() : undefined,
        tanggal_perkawinan: tanggalPerkawinan,
        tempat: tempat.trim() || undefined,
        pelayan_firman: pelayanFirman.trim() || undefined,
        nomor_surat: nomorSurat.trim() || undefined,
        keterangan: keterangan.trim() || undefined,
      };

      await invokeCommand("create_perkawinan_gerejawi", {
        token,
        input,
      });

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
      title="Catat Pernikahan Kudus Gerejawi"
      description="Pencatatan pernikahan kudus GMIST & pembaruan otomatis status perkawinan jemaat"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Mempelai 1 */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Mempelai Pertama (Warga GMIST Maranatha) <span className="text-red-500">*</span>
          </label>
          {selectedM1 ? (
            <div className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50/60">
              <div className="flex items-center gap-2.5">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{selectedM1.nama_lengkap}</div>
                  <div className="text-xs text-slate-500">
                    {selectedM1.nomor_anggota} &bull; {selectedM1.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"} &bull;{" "}
                    {selectedM1.nama_kelompok || "Tanpa Kelompok"}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedM1(null)}
                className="text-xs h-7 px-2.5"
              >
                Ganti
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Ketik nama atau nomor anggota mempelai 1..."
                  value={m1Search}
                  onChange={(e) => setM1Search(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>

              <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white shadow-inner">
                {isSearchingM1 ? (
                  <div className="p-2.5 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Mencari jemaat...
                  </div>
                ) : m1Options.length === 0 ? (
                  <div className="p-2.5 text-center text-xs text-slate-400">Tidak ada jemaat</div>
                ) : (
                  m1Options.map((j) => (
                    <button
                      type="button"
                      key={j.id}
                      onClick={() => setSelectedM1(j)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50/80 transition-colors flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-slate-800">{j.nama_lengkap}</span>
                      <span className="text-slate-400 font-mono">{j.nomor_anggota}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. Pilihan Jenis Pasangan */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-semibold text-slate-700">
            Asal Pasangan / Mempelai Kedua <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPasanganType("INTERNAL")}
              className={`p-3 rounded-lg border text-left text-xs transition-colors flex items-center gap-2 ${
                pasanganType === "INTERNAL"
                  ? "border-blue-600 bg-blue-50/60 font-semibold text-blue-900"
                  : "border-slate-200 hover:bg-slate-50 text-slate-600"
              }`}
            >
              <Heart className="w-4 h-4 text-blue-600" />
              <span>Sesama Jemaat Maranatha</span>
            </button>
            <button
              type="button"
              onClick={() => setPasanganType("EXTERNAL")}
              className={`p-3 rounded-lg border text-left text-xs transition-colors flex items-center gap-2 ${
                pasanganType === "EXTERNAL"
                  ? "border-blue-600 bg-blue-50/60 font-semibold text-blue-900"
                  : "border-slate-200 hover:bg-slate-50 text-slate-600"
              }`}
            >
              <User className="w-4 h-4 text-slate-600" />
              <span>Pasangan Luar Jemaat</span>
            </button>
          </div>
        </div>

        {/* 3. Mempelai 2 / Pasangan Luar */}
        {pasanganType === "INTERNAL" ? (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Mempelai Kedua (Warga GMIST Maranatha) <span className="text-red-500">*</span>
            </label>
            {selectedM2 ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-pink-200 bg-pink-50/60">
                <div className="flex items-center gap-2.5">
                  <Heart className="w-5 h-5 text-pink-600" />
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{selectedM2.nama_lengkap}</div>
                    <div className="text-xs text-slate-500">
                      {selectedM2.nomor_anggota} &bull; {selectedM2.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedM2(null)}
                  className="text-xs h-7 px-2.5"
                >
                  Ganti
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <Input
                    placeholder="Ketik nama atau nomor anggota mempelai 2..."
                    value={m2Search}
                    onChange={(e) => setM2Search(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>

                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white shadow-inner">
                  {isSearchingM2 ? (
                    <div className="p-2.5 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Mencari jemaat...
                    </div>
                  ) : m2Options.length === 0 ? (
                    <div className="p-2.5 text-center text-xs text-slate-400">Tidak ada jemaat</div>
                  ) : (
                    m2Options.map((j) => (
                      <button
                        type="button"
                        key={j.id}
                        onClick={() => setSelectedM2(j)}
                        className="w-full text-left px-3 py-2 hover:bg-pink-50/80 transition-colors flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-800">{j.nama_lengkap}</span>
                        <span className="text-slate-400 font-mono">{j.nomor_anggota}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Nama Lengkap Pasangan dari Luar Jemaat <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Contoh: Maria Magdalena (Gereja GMIM Bethesda Manado)"
              value={namaPasanganLuar}
              onChange={(e) => setNamaPasanganLuar(e.target.value)}
              required
            />
          </div>
        )}

        {/* 4. Tanggal & Nomor Surat */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Tanggal Pernikahan Gerejawi <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={tanggalPerkawinan}
              onChange={(e) => setTanggalPerkawinan(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Nomor Surat / Akta Nikah Gereja
            </label>
            <Input
              placeholder="Contoh: NIK/2026/007"
              value={nomorSurat}
              onChange={(e) => setNomorSurat(e.target.value)}
            />
          </div>
        </div>

        {/* 5. Tempat & Pelayan Firman */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Tempat Pemberkatan
            </label>
            <Input
              value={tempat}
              onChange={(e) => setTempat(e.target.value)}
              placeholder="Gedung Gereja GMIST Maranatha Tahuna"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Pelayan Firman / Pendeta
            </label>
            <Input
              placeholder="Contoh: Pdt. M. Sasundu, M.Th"
              value={pelayanFirman}
              onChange={(e) => setPelayanFirman(e.target.value)}
            />
          </div>
        </div>

        {/* 6. Keterangan */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Keterangan / Catatan Tambahan
          </label>
          <Input
            placeholder="Catatan perkawinan kudus..."
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
          />
        </div>

        {/* Info Banner Otomasi Status */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p>
            Setelah disimpan, status perkawinan jemaat akan otomatis diperbarui menjadi <strong>MENIKAH</strong>. Jika jemaat sebelumnya berada di Pelka Pemuda, sistem akan menyarankan mutasi ke <strong>Pelka Kaum Bapa (PKB)</strong> atau <strong>Pelka Kaum Ibu (WKI)</strong> pada Antrean Tinjauan Pelka.
          </p>
        </div>

        <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Heart className="w-4 h-4" />
                <span>Simpan Pernikahan Kudus</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
