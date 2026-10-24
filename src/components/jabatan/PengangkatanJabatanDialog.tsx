"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  JabatanItem,
  JemaatListItem,
  PengangkatanJabatanInput,
} from "@/types";
import { invokeCommand, MOCK_KELOMPOK, MOCK_PELKA } from "@/lib/tauri";
import { getAuthToken } from "@/lib/auth-context";
import {
  AlertTriangle,
  Award,
  CheckCircle,
  Loader2,
  Search,
  User,
} from "lucide-react";

interface PengangkatanJabatanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  jabatanList: JabatanItem[];
}

export function PengangkatanJabatanDialog({
  isOpen,
  onClose,
  onSuccess,
  jabatanList,
}: PengangkatanJabatanDialogProps) {
  const token = getAuthToken();

  const [jemaatSearch, setJemaatSearch] = useState("");
  const [jemaatOptions, setJemaatOptions] = useState<JemaatListItem[]>([]);
  const [isSearchingJemaat, setIsSearchingJemaat] = useState(false);
  const [selectedJemaat, setSelectedJemaat] = useState<JemaatListItem | null>(null);

  const [jabatanId, setJabatanId] = useState("");
  const [lingkup, setLingkup] = useState<"JEMAAT" | "KELOMPOK" | "PELKA">("JEMAAT");
  const [kelompokId, setKelompokId] = useState("");
  const [pelkaId, setPelkaId] = useState("");
  const [tanggalPengangkatan, setTanggalPengangkatan] = useState("");
  const [tanggalBerakhir, setTanggalBerakhir] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedJemaat(null);
      setJemaatSearch("");
      setJabatanId(jabatanList[0]?.id || "");
      setLingkup("JEMAAT");
      setKelompokId("");
      setPelkaId("");
      setTanggalPengangkatan(new Date().toISOString().split("T")[0]);
      setTanggalBerakhir("");
      setKeterangan("");
      setErrorMsg(null);
    }
  }, [isOpen, jabatanList]);

  // Handle jemaat search
  useEffect(() => {
    if (!isOpen || selectedJemaat) return;

    const timer = setTimeout(async () => {
      try {
        setIsSearchingJemaat(true);
        const res = await invokeCommand<{ items: JemaatListItem[] }>("list_jemaat", {
          token,
          filter: {
            search: jemaatSearch.trim() || undefined,
            status_keanggotaan: "AKTIF",
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
  }, [jemaatSearch, isOpen, selectedJemaat, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJemaat) {
      setErrorMsg("Pilih jemaat yang diangkat menjadi pejabat");
      return;
    }
    if (!jabatanId) {
      setErrorMsg("Pilih jabatan pelayanan");
      return;
    }
    if (!tanggalPengangkatan) {
      setErrorMsg("Tanggal pengangkatan wajib diisi");
      return;
    }
    if (lingkup === "KELOMPOK" && !kelompokId) {
      setErrorMsg("Pilih kelompok untuk lingkup Kelompok");
      return;
    }
    if (lingkup === "PELKA" && !pelkaId) {
      setErrorMsg("Pilih Pelka untuk lingkup Pelayanan Kategorial");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const input: PengangkatanJabatanInput = {
        jemaat_id: selectedJemaat.id,
        jabatan_id: jabatanId,
        lingkup,
        kelompok_id: lingkup === "KELOMPOK" ? kelompokId : undefined,
        pelka_id: lingkup === "PELKA" ? pelkaId : undefined,
        tanggal_pengangkatan: tanggalPengangkatan,
        tanggal_berakhir: tanggalBerakhir.trim() ? tanggalBerakhir : undefined,
        keterangan: keterangan.trim() ? keterangan : undefined,
      };

      await invokeCommand("create_pengangkatan_jabatan", {
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
      title="Catat Pengangkatan Jabatan Pelayanan"
      description="Penetapan pelayan khusus (Penatua/Diaken) atau pengurus fungsional/struktural GMIST"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Pilih Jemaat */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Jemaat yang Diangkat <span className="text-red-500">*</span>
          </label>
          {selectedJemaat ? (
            <div className="flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50/60">
              <div className="flex items-center gap-2.5">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{selectedJemaat.nama_lengkap}</div>
                  <div className="text-xs text-slate-500">
                    {selectedJemaat.nomor_anggota} &bull; {selectedJemaat.nama_kelompok || "Tanpa Kelompok"} &bull;{" "}
                    {selectedJemaat.nama_pelka || "Tanpa Pelka"}
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

              {/* Suggestions */}
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white shadow-inner">
                {isSearchingJemaat ? (
                  <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Mencari data jemaat...
                  </div>
                ) : jemaatOptions.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    Tidak ada jemaat yang cocok
                  </div>
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
                      <span className="text-slate-500">{j.nama_kelompok || "-"}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. Pilihan Jabatan & Lingkup */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Jabatan Pelayanan <span className="text-red-500">*</span>
            </label>
            <select
              value={jabatanId}
              onChange={(e) => setJabatanId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {jabatanList.map((jab) => (
                <option key={jab.id} value={jab.id}>
                  {jab.nama_jabatan} ({jab.jenis})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Lingkup Jabatan <span className="text-red-500">*</span>
            </label>
            <select
              value={lingkup}
              onChange={(e) => setLingkup(e.target.value as any)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="JEMAAT">Lingkup Jemaat (Semua Jemaat)</option>
              <option value="KELOMPOK">Lingkup Kelompok Pelayanan</option>
              <option value="PELKA">Lingkup Pelayanan Kategorial (Pelka)</option>
            </select>
          </div>
        </div>

        {/* 3. Detail Lingkup Dinamis */}
        {lingkup === "KELOMPOK" && (
          <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-slate-50">
            <label className="block text-xs font-semibold text-slate-700">
              Pilih Kelompok Pelayanan <span className="text-red-500">*</span>
            </label>
            <select
              value={kelompokId}
              onChange={(e) => setKelompokId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Pilih Kelompok --</option>
              {MOCK_KELOMPOK.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama} ({k.deskripsi})
                </option>
              ))}
            </select>
          </div>
        )}

        {lingkup === "PELKA" && (
          <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-slate-50">
            <label className="block text-xs font-semibold text-slate-700">
              Pilih Pelka <span className="text-red-500">*</span>
            </label>
            <select
              value={pelkaId}
              onChange={(e) => setPelkaId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Pilih Pelka --</option>
              {MOCK_PELKA.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} ({p.kode})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 4. Periode Pengangkatan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Tanggal Pengangkatan <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={tanggalPengangkatan}
              onChange={(e) => setTanggalPengangkatan(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Tanggal Berakhir (Opsional)
            </label>
            <Input
              type="date"
              value={tanggalBerakhir}
              onChange={(e) => setTanggalBerakhir(e.target.value)}
            />
            <span className="text-[11px] text-slate-400">Kosongkan jika belum ditentukan</span>
          </div>
        </div>

        {/* 5. Keterangan / Nomor SK */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Keterangan / Nomor SK / Dasar Pengangkatan
          </label>
          <Input
            placeholder="Contoh: SK Pelayan Khusus GMIST No. 12/SK/2024 Periode 2024-2028"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200">
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
                <Award className="w-4 h-4" />
                <span>Simpan Pengangkatan</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
