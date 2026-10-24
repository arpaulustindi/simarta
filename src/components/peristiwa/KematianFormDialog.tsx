"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JemaatListItem, CatatKematianInput } from "@/types";
import { invokeCommand } from "@/lib/tauri";
import { getAuthToken } from "@/lib/auth-context";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Search,
  ShieldAlert,
  User,
} from "lucide-react";

interface KematianFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function KematianFormDialog({
  isOpen,
  onClose,
  onSuccess,
}: KematianFormDialogProps) {
  const token = getAuthToken();

  const [jemaatSearch, setJemaatSearch] = useState("");
  const [jemaatOptions, setJemaatOptions] = useState<JemaatListItem[]>([]);
  const [isSearchingJemaat, setIsSearchingJemaat] = useState(false);
  const [selectedJemaat, setSelectedJemaat] = useState<JemaatListItem | null>(null);

  const [tanggalMeninggal, setTanggalMeninggal] = useState("");
  const [tempatMeninggal, setTempatMeninggal] = useState("");
  const [tempatPemakaman, setTempatPemakaman] = useState("");
  const [pelayanPemakaman, setPelayanPemakaman] = useState("");
  const [nomorSuratKematian, setNomorSuratKematian] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedJemaat(null);
      setJemaatSearch("");
      setTanggalMeninggal(new Date().toISOString().split("T")[0]);
      setTempatMeninggal("Tahuna");
      setTempatPemakaman("TPU Kolongan Tahuna");
      setPelayanPemakaman("");
      setNomorSuratKematian("");
      setKeterangan("");
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
      setErrorMsg("Pilih jemaat yang meninggal dunia");
      return;
    }
    if (!tanggalMeninggal) {
      setErrorMsg("Tanggal meninggal dunia wajib diisi");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const input: CatatKematianInput = {
        jemaat_id: selectedJemaat.id,
        tanggal_meninggal: tanggalMeninggal,
        tempat_meninggal: tempatMeninggal.trim() || undefined,
        tempat_pemakaman: tempatPemakaman.trim() || undefined,
        pelayan_pemakaman: pelayanPemakaman.trim() || undefined,
        nomor_surat_kematian: nomorSuratKematian.trim() || undefined,
        keterangan: keterangan.trim() || undefined,
      };

      await invokeCommand("catat_kematian", {
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
      title="Pencatatan Berita Duka & Kematian"
      description="Pencatatan wafat warga jemaat GMIST Maranatha Tahuna"
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
            Warga Jemaat yang Wafat <span className="text-red-500">*</span>
          </label>
          {selectedJemaat ? (
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-300 bg-slate-100/70">
              <div className="flex items-center gap-2.5">
                <User className="w-5 h-5 text-slate-600" />
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{selectedJemaat.nama_lengkap}</div>
                  <div className="text-xs text-slate-500">
                    {selectedJemaat.nomor_anggota} &bull; Tgl Lahir: {selectedJemaat.tanggal_lahir} &bull;{" "}
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
                      className="w-full text-left px-3 py-2 hover:bg-slate-100 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{j.nama_lengkap}</span>
                        <span className="text-slate-400 ml-2 font-mono">{j.nomor_anggota}</span>
                      </div>
                      <span className="text-slate-500">{j.nama_pelka || "-"}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. Tanggal Meninggal & Tempat Meninggal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Tanggal Meninggal Dunia <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={tanggalMeninggal}
              onChange={(e) => setTanggalMeninggal(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Tempat Meninggal
            </label>
            <Input
              placeholder="Contoh: RSUD Liun Kendage / Rumah Duka"
              value={tempatMeninggal}
              onChange={(e) => setTempatMeninggal(e.target.value)}
            />
          </div>
        </div>

        {/* 3. Tempat Pemakaman & Pelayan Pemakaman */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Tempat Pemakaman
            </label>
            <Input
              placeholder="Contoh: TPU Kolongan Akembawi"
              value={tempatPemakaman}
              onChange={(e) => setTempatPemakaman(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Pelayan Pemakaman / Pendeta
            </label>
            <Input
              placeholder="Contoh: Pdt. M. Sasundu, M.Th"
              value={pelayanPemakaman}
              onChange={(e) => setPelayanPemakaman(e.target.value)}
            />
          </div>
        </div>

        {/* 4. Nomor Surat Kematian & Keterangan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Nomor Surat / Akta Kematian
            </label>
            <Input
              placeholder="Contoh: SKM/2026/021"
              value={nomorSuratKematian}
              onChange={(e) => setNomorSuratKematian(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Keterangan / Berita Duka
            </label>
            <Input
              placeholder="Tutup usia dalam damai sejahtera..."
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
            />
          </div>
        </div>

        {/* Efek Otomatisasi Box */}
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Perhatian Dampak Pengarsipan:</span>
            <p className="mt-0.5 text-red-700">
              Setelah dicatat, status keanggotaan jemaat akan otomatis menjadi <strong>MENINGGAL</strong> dan diarsipkan secara rapi. Jika jemaat terdaftar sebagai Kepala Keluarga atau mengemban Jabatan Pelayanan, status kepengurusan aktif tersebut akan diselesaikan terhitung per tanggal meninggal dunia.
            </p>
          </div>
        </div>

        <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="submit"
            className="bg-slate-800 hover:bg-slate-900 text-white flex items-center gap-1.5"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Simpan Berita Duka</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
