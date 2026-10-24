"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JemaatListItem, CreatePeristiwaInput } from "@/types";
import { invokeCommand } from "@/lib/tauri";
import { getAuthToken } from "@/lib/auth-context";
import {
  AlertTriangle,
  Award,
  CheckCircle,
  Church,
  Loader2,
  Search,
  User,
} from "lucide-react";

interface BaptisSidiFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultJenis?: "BAPTIS" | "SIDI" | "PENGAKUAN_DOSA";
}

export function BaptisSidiFormDialog({
  isOpen,
  onClose,
  onSuccess,
  defaultJenis = "BAPTIS",
}: BaptisSidiFormDialogProps) {
  const token = getAuthToken();

  const [jenisPeristiwa, setJenisPeristiwa] = useState<string>(defaultJenis);
  const [jemaatSearch, setJemaatSearch] = useState("");
  const [jemaatOptions, setJemaatOptions] = useState<JemaatListItem[]>([]);
  const [isSearchingJemaat, setIsSearchingJemaat] = useState(false);
  const [selectedJemaat, setSelectedJemaat] = useState<JemaatListItem | null>(null);

  const [tanggalPeristiwa, setTanggalPeristiwa] = useState("");
  const [tempat, setTempat] = useState("GMIST Maranatha Tahuna");
  const [pelayanFirman, setPelayanFirman] = useState("");
  const [nomorSurat, setNomorSurat] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setJenisPeristiwa(defaultJenis);
      setSelectedJemaat(null);
      setJemaatSearch("");
      setTanggalPeristiwa(new Date().toISOString().split("T")[0]);
      setTempat("GMIST Maranatha Tahuna");
      setPelayanFirman("");
      setNomorSurat("");
      setKeterangan("");
      setErrorMsg(null);
    }
  }, [isOpen, defaultJenis]);

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
      setErrorMsg("Pilih jemaat yang menerima sakramen / peneguhan");
      return;
    }
    if (!tanggalPeristiwa) {
      setErrorMsg("Tanggal peristiwa wajib diisi");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const input: CreatePeristiwaInput = {
        jemaat_id: selectedJemaat.id,
        jenis_peristiwa: jenisPeristiwa,
        tanggal_peristiwa: tanggalPeristiwa,
        tempat: tempat.trim() || undefined,
        pelayan_firman: pelayanFirman.trim() || undefined,
        nomor_surat: nomorSurat.trim() || undefined,
        keterangan: keterangan.trim() || undefined,
      };

      await invokeCommand("create_peristiwa_gerejawi", {
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
      title={
        jenisPeristiwa === "BAPTIS"
          ? "Catat Sakramen Baptis Kudus"
          : jenisPeristiwa === "SIDI"
          ? "Catat Peneguhan Sidi"
          : "Catat Peristiwa Gerejawi"
      }
      description="Pencatatan sakramen gerejawi GMIST Maranatha Tahuna"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Jenis Peristiwa */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Jenis Peristiwa Gerejawi <span className="text-red-500">*</span>
          </label>
          <select
            value={jenisPeristiwa}
            onChange={(e) => setJenisPeristiwa(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="BAPTIS">Sakramen Baptis Kudus</option>
            <option value="SIDI">Peneguhan Sidi</option>
            <option value="PENGAKUAN_DOSA">Pengakuan Dosa</option>
            <option value="LAINNYA">Peristiwa Gerejawi Lainnya</option>
          </select>
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

              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white shadow-inner">
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
                      <span className="text-slate-500">{j.nama_pelka || "-"}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. Tanggal & Nomor Surat */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Tanggal Peristiwa <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={tanggalPeristiwa}
              onChange={(e) => setTanggalPeristiwa(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Nomor Surat / Akta
            </label>
            <Input
              placeholder="Contoh: BAP/2026/012 atau SIDI/2026/005"
              value={nomorSurat}
              onChange={(e) => setNomorSurat(e.target.value)}
            />
          </div>
        </div>

        {/* 3. Tempat & Pelayan Firman */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Tempat Pelaksanaan
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

        {/* 4. Keterangan */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Keterangan / Catatan Tambahan
          </label>
          <Input
            placeholder="Catatan khusus peristiwa gerejawi..."
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
          />
        </div>

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
                <CheckCircle className="w-4 h-4" />
                <span>Simpan Peristiwa</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
