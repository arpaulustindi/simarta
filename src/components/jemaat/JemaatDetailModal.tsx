"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JemaatDetail } from "@/types";
import {
  User,
  Home,
  Layers,
  HeartHandshake,
  History,
  Calendar,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Sparkles,
  Info,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface JemaatDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  jemaat: JemaatDetail | null;
  onEdit?: () => void;
  isAdmin?: boolean;
}

export function JemaatDetailModal({
  isOpen,
  onClose,
  jemaat,
  onEdit,
  isAdmin = false,
}: JemaatDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"pribadi" | "keluarga" | "pelka" | "riwayat">("pribadi");

  if (!jemaat) return null;

  const isPelkaMismatch =
    jemaat.kode_pelka &&
    jemaat.pelka_recommendation?.kode &&
    jemaat.pelka_recommendation.kode !== "TIDAK_DAPAT_DITENTUKAN" &&
    jemaat.pelka_recommendation.kode !== "BELUM_DITENTUKAN" &&
    jemaat.kode_pelka !== jemaat.pelka_recommendation.kode;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${jemaat.nama_lengkap} (${jemaat.nomor_anggota})`}
      description={`Warga GMIST Maranatha Tahuna • ${jemaat.nama_kelompok || "Belum ada kelompok"}`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={jemaat.status_keanggotaan === "AKTIF" ? "default" : "secondary"}>
            Status: {jemaat.status_keanggotaan}
          </Badge>
          {jemaat.nama_pelka && (
            <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400">
              {jemaat.nama_pelka}
            </Badge>
          )}
          {jemaat.nama_kelompok && (
            <Badge variant="secondary">
              {jemaat.nama_kelompok}
            </Badge>
          )}
          {jemaat.is_archived && (
            <Badge variant="destructive">DIARSIPKAN</Badge>
          )}
        </div>

        {/* Pelka Mismatch Alert Banner */}
        {isPelkaMismatch && (
          <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
            <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-semibold">Catatan Keselarasan Pelka:</span> Pelka aktual jemaat terdaftar sebagai{" "}
              <strong>{jemaat.nama_pelka}</strong>, sedangkan rekomendasi sistem berdasarkan usia ({jemaat.pelka_recommendation.usia} thn) adalah{" "}
              <strong>{jemaat.pelka_recommendation.nama_pelka}</strong>. Sesuai prinsip GMIST, perbedaan ini sah apabila disetujui Pengurus/Admin.
            </div>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex border-b border-muted">
          <button
            onClick={() => setActiveTab("pribadi")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === "pribadi"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Data Pribadi</span>
          </button>

          <button
            onClick={() => setActiveTab("keluarga")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === "keluarga"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Home className="h-3.5 w-3.5" />
            <span>Kartu Keluarga</span>
          </button>

          <button
            onClick={() => setActiveTab("pelka")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === "pelka"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <HeartHandshake className="h-3.5 w-3.5" />
            <span>Pelka & Kelompok</span>
          </button>

          <button
            onClick={() => setActiveTab("riwayat")}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
              activeTab === "riwayat"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Riwayat & Peristiwa</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="pt-2 text-sm">
          {/* TAB 1: PRIBADI */}
          {activeTab === "pribadi" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Nomor Anggota Jemaat</span>
                <p className="font-medium text-foreground font-mono">{jemaat.nomor_anggota}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Tempat, Tanggal Lahir</span>
                <p className="font-medium text-foreground">
                  {jemaat.tempat_lahir ? `${jemaat.tempat_lahir}, ` : ""}
                  {jemaat.tanggal_lahir}
                  {jemaat.pelka_recommendation.usia !== undefined && (
                    <span className="text-muted-foreground font-normal text-xs ml-1.5">
                      ({jemaat.pelka_recommendation.usia} tahun)
                    </span>
                  )}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Jenis Kelamin</span>
                <p className="font-medium text-foreground">
                  {jemaat.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Status Perkawinan</span>
                <p className="font-medium text-foreground">
                  {jemaat.status_perkawinan.replace("_", " ")}
                  {jemaat.tanggal_menikah && (
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      (Menikah: {jemaat.tanggal_menikah})
                    </span>
                  )}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Nomor Telepon / HP</span>
                <p className="font-medium text-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{jemaat.nomor_telepon || "Tidak ada"}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Pendidikan Terakhir</span>
                <p className="font-medium text-foreground flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{jemaat.pendidikan_terakhir || "Belum diisi"}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Pekerjaan</span>
                <p className="font-medium text-foreground flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{jemaat.pekerjaan || "Belum diisi"}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Tanggal Terdaftar</span>
                <p className="font-medium text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{jemaat.tanggal_masuk || jemaat.created_at.split("T")[0]}</span>
                </p>
              </div>

              <div className="sm:col-span-2 space-y-1 border-t pt-2 mt-1">
                <span className="text-xs text-muted-foreground">Alamat Domisili</span>
                <p className="font-medium text-foreground flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <span>
                    {jemaat.alamat || "Alamat belum diisi"},{" "}
                    {jemaat.desa_kelurahan || "Tahuna"},{" "}
                    {jemaat.kecamatan || "Tahuna"}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: KELUARGA */}
          {activeTab === "keluarga" && (
            <div className="space-y-4">
              {jemaat.keluarga ? (
                <div className="rounded-lg border p-4 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Terdaftar dalam Kartu Keluarga
                    </span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {jemaat.keluarga.nomor_keluarga}
                    </Badge>
                  </div>
                  <h4 className="text-base font-bold text-foreground">
                    {jemaat.keluarga.nama_keluarga}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Kedudukan dalam Keluarga:</span>
                    <Badge variant="secondary" className="font-semibold">
                      {jemaat.keluarga.hubungan_keluarga.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-xs">
                  <Home className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>Jemaat ini belum terdaftar di Kartu Keluarga manapun.</p>
                  <p className="mt-1">
                    Anda dapat mendaftarkannya melalui menu <strong>Keluarga</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PELKA & KELOMPOK */}
          {activeTab === "pelka" && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/20 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Kelompok Ibadah Rumah Tangga
                </span>
                <p className="text-base font-semibold text-foreground">
                  {jemaat.nama_kelompok || "Belum Ditentukan"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pelayanan penggembalaan dan ibadah wilayah GMIST Maranatha Tahuna.
                </p>
              </div>

              <div className="rounded-lg border p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Pelayanan Kategorial (Pelka)
                  </span>
                  <Badge variant="default">{jemaat.nama_pelka || "Belum Ditentukan"}</Badge>
                </div>

                <div className="rounded border bg-background p-3 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Rekomendasi Berdasarkan Aturan Gereja:</span>
                  </div>
                  <p className="text-foreground">
                    <strong>{jemaat.pelka_recommendation.nama_pelka}</strong> ({jemaat.pelka_recommendation.kode})
                  </p>
                  <p className="text-muted-foreground italic text-[11px]">
                    "{jemaat.pelka_recommendation.alasan}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RIWAYAT & PERISTIWA */}
          {activeTab === "riwayat" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-blue-500" />
                  <span>Riwayat Perpindahan Kelompok Ibadah</span>
                </h4>
                {jemaat.riwayat_kelompok.length > 0 ? (
                  <div className="border rounded-lg divide-y text-xs">
                    {jemaat.riwayat_kelompok.map((rk) => (
                      <div key={rk.id} className="p-3 space-y-1">
                        <div className="flex justify-between font-medium">
                          <span>
                            {rk.kelompok_asal || "Awal"} &rarr; {rk.kelompok_tujuan}
                          </span>
                          <span className="text-muted-foreground">{rk.tanggal_perpindahan}</span>
                        </div>
                        {rk.alasan && (
                          <p className="text-muted-foreground text-[11px]">Alasan: {rk.alasan}</p>
                        )}
                        {rk.recorded_by_name && (
                          <p className="text-[10px] text-muted-foreground">
                            Dicatat oleh: {rk.recorded_by_name}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Belum ada riwayat perpindahan kelompok.
                  </p>
                )}
              </div>

              <div className="border-t pt-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-green-500" />
                  <span>Riwayat Peristiwa Gerejawi</span>
                </h4>
                {jemaat.riwayat_gerejawi.length > 0 ? (
                  <div className="border rounded-lg divide-y text-xs">
                    {jemaat.riwayat_gerejawi.map((rg) => (
                      <div key={rg.id} className="p-3 space-y-1">
                        <div className="flex justify-between font-semibold">
                          <Badge variant="outline">{rg.jenis_peristiwa}</Badge>
                          <span className="text-muted-foreground">{rg.tanggal_peristiwa}</span>
                        </div>
                        {rg.tempat && (
                          <p className="text-foreground text-[11px]">Tempat: {rg.tempat}</p>
                        )}
                        {rg.pelayan_firman && (
                          <p className="text-muted-foreground text-[11px]">
                            Pelayan Firman: {rg.pelayan_firman}
                          </p>
                        )}
                        {rg.nomor_surat && (
                          <p className="text-muted-foreground text-[10px]">
                            No. Surat/Sertifikat: {rg.nomor_surat}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Belum ada catatan peristiwa gerejawi (Baptis/Sidi/Pernikahan).
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-4">
          <span className="text-[11px] text-muted-foreground">
            Terakhir diubah: {new Date(jemaat.updated_at).toLocaleString("id-ID")}
          </span>
          <div className="flex items-center gap-2">
            {isAdmin && onEdit && !jemaat.is_archived && (
              <Button variant="default" size="sm" onClick={onEdit}>
                Ubah Data
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
