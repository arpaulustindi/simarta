"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JemaatListItem, CreateAtestasiKeluarInput, CreateAtestasiMasukInput } from "@/types";
import { invokeCommand } from "@/lib/tauri";
import { getAuthToken } from "@/lib/auth-context";
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle,
  Clock,
  Loader2,
  LogOut,
  LogIn,
  Search,
  User,
} from "lucide-react";

interface AtestasiFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AtestasiFormDialog({
  isOpen,
  onClose,
  onSuccess,
}: AtestasiFormDialogProps) {
  const token = getAuthToken();

  const [mode, setMode] = useState<"KELUAR" | "MASUK">("KELUAR");

  // Jemaat selection
  const [jemaatSearch, setJemaatSearch] = useState("");
  const [jemaatOptions, setJemaatOptions] = useState<JemaatListItem[]>([]);
  const [isSearchingJemaat, setIsSearchingJemaat] = useState(false);
  const [selectedJemaat, setSelectedJemaat] = useState<JemaatListItem | null>(null);

  // Form inputs
  const [namaGereja, setNamaGereja] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [nomorSurat, setNomorSurat] = useState("");
  const [alasan, setAlasan] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode("KELUAR");
      setSelectedJemaat(null);
      setJemaatSearch("");
      setNamaGereja("");
      setTanggal(new Date().toISOString().split("T")[0]);
      setNomorSurat("");
      setAlasan("");
      setErrorMsg(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || selectedJemaat) return;

    const timer = setTimeout(async () => {
      try {
        setIsSearchingJemaat(true);
        const res = await invokeCommand<{ items: JemaatListItem[] }>("list_jemaat", {
          token,
          filter: {
            search: jemaatSearch.trim() || undefined,
            // When keluar, search active jemaat; when masuk, can search nonaktif/pindah or any
            status_keanggotaan: mode === "KELUAR" ? "AKTIF" : undefined,
            include_archived: false,
            page: 1,
            page_size: 15,
          },
        });
        setJemaatOptions(res.items || []);
      } catch (err: any) {
        console.error("Gagal mencari jemaat:", err);
      } finally {
        setIsSearchingJemaat(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [jemaatSearch, isOpen, selectedJemaat, mode, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJemaat) {
      setErrorMsg("Pilih jemaat yang dimutasi");
      return;
    }
    if (!namaGereja.trim()) {
      setErrorMsg(mode === "KELUAR" ? "Nama gereja/jemaat tujuan wajib diisi" : "Nama gereja asal wajib diisi");
      return;
    }
    if (!tanggal) {
      setErrorMsg("Tanggal atestasi wajib diisi");
      return;
    }
    if (mode === "KELUAR" && !alasan.trim()) {
      setErrorMsg("Alasan pindah keanggotaan wajib diisi");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      if (mode === "KELUAR") {
        const input: CreateAtestasiKeluarInput = {
          jemaat_id: selectedJemaat.id,
          gereja_tujuan: namaGereja.trim(),
          tanggal_keluar: tanggal,
          nomor_surat: nomorSurat.trim() || undefined,
          alasan: alasan.trim(),
        };
        await invokeCommand("create_atestasi_keluar", { token, input });
      } else {
        const input: CreateAtestasiMasukInput = {
          jemaat_id: selectedJemaat.id,
          gereja_asal: namaGereja.trim(),
          tanggal_masuk: tanggal,
          nomor_surat: nomorSurat.trim() || undefined,
          keterangan: alasan.trim() || undefined,
        };
        await invokeCommand("create_atestasi_masuk", { token, input });
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
      title="Pencatatan Mutasi Atestasi Jemaat"
      description="Pencatatan surat atestasi pindah keluar atau pindah masuk warga jemaat"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setMode("KELUAR");
              setSelectedJemaat(null);
            }}
            className={`p-3 rounded-lg border text-left text-xs transition-colors flex items-center gap-2 ${
              mode === "KELUAR"
                ? "border-amber-500 bg-amber-50/60 font-semibold text-amber-900"
                : "border-slate-200 hover:bg-slate-50 text-slate-600"
            }`}
          >
            <LogOut className="w-4 h-4 text-amber-600" />
            <div>
              <div className="font-bold">Atestasi Pindah Keluar</div>
              <div className="text-[11px] text-slate-500 font-normal">Pindah ke jemaat/gereja lain</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("MASUK");
              setSelectedJemaat(null);
            }}
            className={`p-3 rounded-lg border text-left text-xs transition-colors flex items-center gap-2 ${
              mode === "MASUK"
                ? "border-blue-600 bg-blue-50/60 font-semibold text-blue-900"
                : "border-slate-200 hover:bg-slate-50 text-slate-600"
            }`}
          >
            <LogIn className="w-4 h-4 text-blue-600" />
            <div>
              <div className="font-bold">Atestasi Pindah Masuk</div>
              <div className="text-[11px] text-slate-500 font-normal">Diterima dari jemaat/gereja lain</div>
            </div>
          </button>
        </div>

        {/* 1. Pilih Jemaat */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Warga Jemaat <span className="text-red-500">*</span>
          </label>
          {selectedJemaat ? (
            <div className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50/60">
              <div className="flex items-center gap-2.5">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{selectedJemaat.nama_lengkap}</div>
                  <div className="text-xs text-slate-500">
                    {selectedJemaat.nomor_anggota} &bull; Status: {selectedJemaat.status_keanggotaan} &bull;{" "}
                    {selectedJemaat.nama_kelompok || "Tanpa Kelompok"}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedJemaat(null)}
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
                  placeholder="Ketik nama atau nomor anggota jemaat..."
                  value={jemaatSearch}
                  onChange={(e) => setJemaatSearch(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>

              <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white shadow-inner">
                {isSearchingJemaat ? (
                  <div className="p-2.5 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Mencari jemaat...
                  </div>
                ) : jemaatOptions.length === 0 ? (
                  <div className="p-2.5 text-center text-xs text-slate-400">Tidak ada jemaat</div>
                ) : (
                  jemaatOptions.map((j) => (
                    <button
                      type="button"
                      key={j.id}
                      onClick={() => setSelectedJemaat(j)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50/80 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{j.nama_lengkap}</span>
                        <span className="text-slate-400 ml-2 font-mono">{j.nomor_anggota}</span>
                      </div>
                      <span className="text-slate-500">Status: {j.status_keanggotaan}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. Nama Gereja Tujuan/Asal & Tanggal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              {mode === "KELUAR" ? "Gereja / Jemaat Tujuan" : "Gereja / Jemaat Asal"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder={mode === "KELUAR" ? "Contoh: GMIST Petra Manado" : "Contoh: GMIST Imanuel Ondong"}
              value={namaGereja}
              onChange={(e) => setNamaGereja(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Tanggal Surat Atestasi <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
            />
          </div>
        </div>

        {/* 3. Nomor Surat & Alasan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Nomor Surat Atestasi
            </label>
            <Input
              placeholder={mode === "KELUAR" ? "Contoh: AT-K/2026/008" : "Contoh: AT-M/2026/003"}
              value={nomorSurat}
              onChange={(e) => setNomorSurat(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              {mode === "KELUAR" ? "Alasan Pindah Keanggotaan *" : "Catatan Tambahan"}
            </label>
            <Input
              placeholder={mode === "KELUAR" ? "Pindah tempat tinggal / dinas..." : "Catatan atestasi masuk..."}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              required={mode === "KELUAR"}
            />
          </div>
        </div>

        {/* Efek Otomatisasi Box */}
        {mode === "KELUAR" ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Setelah surat atestasi keluar dicatat, status keanggotaan jemaat akan otomatis diperbarui menjadi <strong>PINDAH</strong>. Jika jemaat saat ini sedang mengemban jabatan pelayanan aktif, masa jabatannya otomatis ditutup terhitung sejak tanggal surat.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              Setelah surat atestasi masuk dicatat, status keanggotaan jemaat akan diperbarui menjadi <strong>AKTIF</strong> terhitung sejak tanggal atestasi.
            </p>
          </div>
        )}

        <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="submit"
            className={
              mode === "KELUAR"
                ? "bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5"
                : "bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
            }
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-4 h-4" />
                <span>Simpan Atestasi</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
