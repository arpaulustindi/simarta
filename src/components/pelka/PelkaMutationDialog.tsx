"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { PelkaReviewItem, PelkaMutationInput } from "@/types";
import { invokeCommand, MOCK_PELKA } from "@/lib/tauri";
import { useAuth, getAuthToken } from "@/lib/auth-context";
import {
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  CheckCircle,
  Loader2,
  User,
  Info,
} from "lucide-react";

interface PelkaMutationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: PelkaReviewItem | null;
  onSuccess: () => void;
}

export function PelkaMutationDialog({
  isOpen,
  onClose,
  item,
  onSuccess,
}: PelkaMutationDialogProps) {
  const { user, token: ctxToken } = useAuth();
  const token = ctxToken || getAuthToken();

  const [targetPelkaId, setTargetPelkaId] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setTargetPelkaId(item.rekomendasi_id || "pelka-pemuda");
      setReason(`Penyesuaian Pelka sesuai rekomendasi sistem: ${item.alasan_rekomendasi}`);
      setErrorMsg(null);
    }
  }, [item]);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPelkaId) {
      setErrorMsg("Pilih Pelka tujuan mutasi");
      return;
    }
    if (!reason.trim()) {
      setErrorMsg("Alasan persetujuan mutasi wajib diisi untuk catatan audit");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const input: PelkaMutationInput = {
        jemaat_id: item.jemaat_id,
        new_pelka_id: targetPelkaId,
        reason: reason.trim(),
      };

      await invokeCommand("apply_pelka_mutation", {
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
      title="Tinjau & Setujui Mutasi Pelka"
      description="Verifikasi rekomendasi usia/status dan sahkan perpindahan Pelka jemaat"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Info Jemaat Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-slate-800 text-base">{item.nama_lengkap}</span>
            </div>
            <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
              {item.nomor_anggota}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs text-slate-600 border-t border-slate-200">
            <div>
              <span className="block text-slate-400">Jenis Kelamin:</span>
              <span className="font-medium text-slate-700">{item.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}</span>
            </div>
            <div>
              <span className="block text-slate-400">Usia:</span>
              <span className="font-medium text-slate-700">{item.usia} Tahun</span>
            </div>
            <div>
              <span className="block text-slate-400">Status Kawin:</span>
              <span className="font-medium text-slate-700">{item.status_perkawinan.replace("_", " ")}</span>
            </div>
            <div>
              <span className="block text-slate-400">Kelompok:</span>
              <span className="font-medium text-slate-700">{item.nama_kelompok || "-"}</span>
            </div>
          </div>
        </div>

        {/* Perbandingan Pelka */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          {/* Pelka Aktual Saat Ini */}
          <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-3">
            <div className="text-xs text-amber-700 font-medium mb-1">Pelka Saat Ini (Aktual)</div>
            <div className="font-semibold text-slate-800 text-sm">
              {item.pelka_aktual_nama || <span className="text-slate-400 italic">Belum Ada Pelka</span>}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Kode: {item.pelka_aktual_kode || "-"}
            </div>
          </div>

          {/* Pelka Rekomendasi Sistem */}
          <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3">
            <div className="text-xs text-blue-700 font-medium mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Rekomendasi Sistem
            </div>
            <div className="font-semibold text-blue-900 text-sm">
              {item.rekomendasi_nama}
            </div>
            <div className="text-xs text-blue-600 mt-0.5">
              {item.alasan_rekomendasi}
            </div>
          </div>
        </div>

        {/* Pilihan Pelka Tujuan */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Tetapkan Pelka Tujuan <span className="text-red-500">*</span>
          </label>
          <select
            value={targetPelkaId}
            onChange={(e) => setTargetPelkaId(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {MOCK_PELKA.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama} ({p.kode}) {p.id === item.rekomendasi_id ? "— [Disarankan Sistem]" : ""}
              </option>
            ))}
          </select>
          {targetPelkaId !== item.rekomendasi_id && (
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
              <Info className="w-3.5 h-3.5" /> Pelka yang dipilih berbeda dari saran otomatis sistem.
            </p>
          )}
        </div>

        {/* Alasan Mutasi / Catatan Persetujuan */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            Alasan Persetujuan Mutasi <span className="text-red-500">* (Catatan Audit)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Contoh: Bertambah usia memasuki kategori Pemuda, telah diverifikasi oleh Majelis Jemaat"
            className="w-full p-2.5 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-xs text-slate-500">
            Catatan ini wajib diisi dan akan dicatat secara permanen di Audit Log bersama akun Administrator ({user?.username}).
          </p>
        </div>

        {/* Warning Principle Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Prinsip Integritas Pelka GMIST Maranatha:</span>
            <p className="mt-0.5 text-amber-700">
              Sistem tidak pernah memindahkan anggota Pelka secara otomatis. Persetujuan manual ini menjamin data jemaat selalu diverifikasi dan dapat dipertanggungjawabkan.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
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
                <CheckCircle className="w-4 h-4" />
                <span>Sahkan Mutasi Pelka</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
