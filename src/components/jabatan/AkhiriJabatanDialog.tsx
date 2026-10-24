"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PejabatAktifItem, AkhiriJabatanInput } from "@/types";
import { invokeCommand } from "@/lib/tauri";
import { getAuthToken } from "@/lib/auth-context";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  ShieldAlert,
} from "lucide-react";

interface AkhiriJabatanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pejabat: PejabatAktifItem | null;
  onSuccess: () => void;
}

export function AkhiriJabatanDialog({
  isOpen,
  onClose,
  pejabat,
  onSuccess,
}: AkhiriJabatanDialogProps) {
  const token = getAuthToken();

  const [tanggalBerakhir, setTanggalBerakhir] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (pejabat) {
      setTanggalBerakhir(new Date().toISOString().split("T")[0]);
      setKeterangan("Selesai masa bakti jabatan pelayanan");
      setErrorMsg(null);
    }
  }, [pejabat]);

  if (!pejabat) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tanggalBerakhir) {
      setErrorMsg("Tanggal pengakhiran jabatan wajib diisi");
      return;
    }
    if (!keterangan.trim()) {
      setErrorMsg("Keterangan pengakhiran jabatan wajib diisi untuk catatan riwayat");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const input: AkhiriJabatanInput = {
        riwayat_id: pejabat.id,
        tanggal_berakhir: tanggalBerakhir,
        keterangan: keterangan.trim(),
      };

      await invokeCommand("akhiri_masa_jabatan", {
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
      title="Akhiri Masa Jabatan Pelayanan"
      description="Catat tanggal penyelesaian masa tugas atau mutasi pejabat pelayanan"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Ringkasan Pejabat */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="font-semibold text-slate-900 text-sm">{pejabat.nama_lengkap}</div>
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span className="font-medium text-blue-700">{pejabat.nama_jabatan}</span>
            <span>&bull;</span>
            <span>Lingkup: {pejabat.lingkup}</span>
          </div>
          <div className="text-xs text-slate-500">
            Terhitung sejak: <span className="font-medium text-slate-700">{pejabat.tanggal_pengangkatan}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Tanggal Pengakhiran Jabatan <span className="text-red-500">*</span>
          </label>
          <Input
            type="date"
            value={tanggalBerakhir}
            onChange={(e) => setTanggalBerakhir(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Keterangan / Alasan Pengakhiran <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="Contoh: Selesai masa bakti periode 2020-2024, Mutasi ke luar daerah, dll"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            required
          />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            Setelah disimpan, jabatan ini akan otomatis dipindahkan ke riwayat masa lalu dan tidak lagi berstatus aktif. Tindakan ini dicatat dalam Audit Log.
          </p>
        </div>

        <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5"
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
                <span>Akhiri Jabatan</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
