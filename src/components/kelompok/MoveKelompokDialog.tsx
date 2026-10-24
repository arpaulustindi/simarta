"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { invokeCommand } from "@/lib/tauri";
import { KelompokListItem, MoveKelompokInput } from "@/types";
import { ArrowRightLeft, AlertTriangle } from "lucide-react";

interface MoveKelompokDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
  jemaatId: string;
  jemaatNama: string;
  currentKelompokId: string;
  kelompokList: KelompokListItem[];
}

export function MoveKelompokDialog({
  isOpen,
  onClose,
  onSuccess,
  token,
  jemaatId,
  jemaatNama,
  currentKelompokId,
  kelompokList,
}: MoveKelompokDialogProps) {
  const [tujuanId, setTujuanId] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [alasan, setAlasan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const availableTargets = kelompokList.filter((k) => k.id !== currentKelompokId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!tujuanId) {
      setErrorMsg("Pilih kelompok tujuan perpindahan");
      return;
    }
    if (!tanggal) {
      setErrorMsg("Tanggal perpindahan wajib diisi");
      return;
    }
    if (!alasan.trim()) {
      setErrorMsg("Alasan perpindahan wajib diisi (dicatat ke riwayat perpindahan)");
      return;
    }

    try {
      setIsSubmitting(true);
      const input: MoveKelompokInput = {
        jemaat_id: jemaatId,
        kelompok_tujuan_id: tujuanId,
        tanggal_perpindahan: tanggal,
        alasan: alasan.trim(),
      };
      await invokeCommand("move_jemaat_kelompok", { token, input });
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
      title="Pindahkan Kelompok Ibadah"
      description={`Mutasi wilayah ibadah jemaat: ${jemaatNama}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 text-red-700 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <span className="text-[11px] text-muted-foreground block">Warga Jemaat:</span>
          <p className="text-sm font-bold text-foreground">{jemaatNama}</p>
        </div>

        <div>
          <label className="font-semibold text-foreground">
            Pilih Kelompok Ibadah Tujuan <span className="text-red-500">*</span>
          </label>
          <select
            value={tujuanId}
            onChange={(e) => setTujuanId(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">-- Pilih Kelompok Tujuan --</option>
            {availableTargets.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama_kelompok} ({k.nomor_kelompok}) — {k.deskripsi}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-semibold text-foreground">
            Tanggal Perpindahan <span className="text-red-500">*</span>
          </label>
          <Input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <label className="font-semibold text-foreground">
            Alasan Perpindahan (Dicatat dalam Riwayat Kelompok & Audit) <span className="text-red-500">*</span>
          </label>
          <Input
            required
            placeholder="Contoh: Pindah tempat tinggal / domisili lingkungan ibadah"
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting || !tujuanId}>
            {isSubmitting ? "Memproses..." : "Pindahkan Kelompok"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
