"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";
import { invokeCommand } from "@/lib/tauri";
import { useAuth, getAuthToken } from "@/lib/auth-context";
import { calculatePelkaRecommendation } from "@/lib/pelka";
import { JemaatExportRow, KeluargaExportRow, JemaatImportRow, ImportSummary } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Download,
  Upload,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Users,
  Home,
  RefreshCw,
} from "lucide-react";

interface ParsedImportItem {
  rowNum: number;
  data: JemaatImportRow;
  isValid: boolean;
  errors: string[];
  pelkaRecommendation?: string;
}

export function ImportExportView() {
  const { user, token: ctxToken } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const token = ctxToken || getAuthToken();

  const [activeTab, setActiveTab] = useState<"ekspor" | "impor">("ekspor");

  // Export states
  const [isExportingJemaat, setIsExportingJemaat] = useState(false);
  const [isExportingKeluarga, setIsExportingKeluarga] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Import states
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedImportItem[]>([]);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // -------------------------------------------------------------
  // EKSPOR HANDLERS
  // -------------------------------------------------------------
  const handleExportJemaat = async () => {
    setIsExportingJemaat(true);
    setExportMessage(null);
    try {
      const data: JemaatExportRow[] = await invokeCommand("get_export_jemaat_data", { token });
      if (!data || data.length === 0) {
        setExportMessage("Tidak ada data jemaat aktif untuk diekspor");
        return;
      }

      const formatted = data.map((j, idx) => ({
        "No": idx + 1,
        "No. Anggota": j.nomor_anggota,
        "NIK": j.nik || "",
        "Nama Lengkap": j.nama_lengkap,
        "Tempat Lahir": j.tempat_lahir || "",
        "Tanggal Lahir": j.tanggal_lahir,
        "Jenis Kelamin": j.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan",
        "Status Perkawinan": j.status_perkawinan,
        "Tanggal Menikah": j.tanggal_menikah || "",
        "Pelka": j.nama_pelka || "",
        "Kelompok Ibadah": j.nama_kelompok || "",
        "Alamat": j.alamat || "",
        "Kelurahan / Desa": j.desa_kelurahan || "",
        "Kecamatan": j.kecamatan || "",
        "No. Telepon": j.nomor_telepon || "",
        "Status": j.status_keanggotaan,
      }));

      const worksheet = XLSX.utils.json_to_sheet(formatted);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Jemaat");

      const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
      XLSX.writeFile(workbook, `Data_Jemaat_GMIST_Maranatha_${timestamp}.xlsx`);
      setExportMessage(`Berhasil mengekspor ${data.length} data jemaat ke Excel`);
    } catch (err: any) {
      setExportMessage(`Gagal mengekspor data jemaat: ${err.message || err}`);
    } finally {
      setIsExportingJemaat(false);
    }
  };

  const handleExportKeluarga = async () => {
    setIsExportingKeluarga(true);
    setExportMessage(null);
    try {
      const data: KeluargaExportRow[] = await invokeCommand("get_export_keluarga_data", { token });
      if (!data || data.length === 0) {
        setExportMessage("Tidak ada data keluarga untuk diekspor");
        return;
      }

      const formatted = data.map((k, idx) => ({
        "No": idx + 1,
        "No. Keluarga": k.nomor_keluarga,
        "Nama Keluarga": k.nama_keluarga,
        "Kepala Keluarga": k.kepala_keluarga || "-",
        "Jumlah Anggota": k.jumlah_anggota,
        "Alamat": k.alamat || "",
        "Status": k.status,
      }));

      const worksheet = XLSX.utils.json_to_sheet(formatted);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Keluarga");

      const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
      XLSX.writeFile(workbook, `Data_Keluarga_GMIST_Maranatha_${timestamp}.xlsx`);
      setExportMessage(`Berhasil mengekspor ${data.length} data keluarga ke Excel`);
    } catch (err: any) {
      setExportMessage(`Gagal mengekspor data keluarga: ${err.message || err}`);
    } finally {
      setIsExportingKeluarga(false);
    }
  };

  // -------------------------------------------------------------
  // IMPOR HANDLERS
  // -------------------------------------------------------------
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "NIK": "7103011505940001",
        "Nama Lengkap": "Contoh Nama Jemaat Satu",
        "Tempat Lahir": "Tahuna",
        "Tanggal Lahir": "1994-05-15",
        "Jenis Kelamin": "L",
        "Status Perkawinan": "BELUM_MENIKAH",
        "Alamat": "Kelurahan Sawang Bendar",
        "No Telepon": "081234567890",
        "No Kelompok": "3",
      },
      {
        "NIK": "7103016610640002",
        "Nama Lengkap": "Contoh Nama Jemaat Dua",
        "Tempat Lahir": "Tahuna",
        "Tanggal Lahir": "1964-10-26",
        "Jenis Kelamin": "P",
        "Status Perkawinan": "MENIKAH",
        "Alamat": "Kompleks Maranatha",
        "No Telepon": "082198765432",
        "No Kelompok": "1",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Impor Jemaat");
    XLSX.writeFile(workbook, "Template_Impor_Jemaat_SiMarta.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportSummary(null);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (rawJson.length === 0) {
          setImportError("File Excel kosong atau tidak memiliki baris data");
          setParsedRows([]);
          return;
        }

        const seenNiks = new Set<string>();
        const parsed: ParsedImportItem[] = [];

        rawJson.forEach((row, index) => {
          const rowNum = index + 2; // header is row 1
          const errors: string[] = [];

          // Map column names leniently
          const namaLengkap = String(row["Nama Lengkap"] || row["Nama"] || row["NAMA"] || "").trim();
          const nikRaw = String(row["NIK"] || row["Nik"] || "").trim();
          const tempatLahir = String(row["Tempat Lahir"] || row["Tempat"] || "").trim();
          let tglLahirRaw = String(row["Tanggal Lahir"] || row["Tgl Lahir"] || "").trim();
          let jenisKelamin = String(row["Jenis Kelamin"] || row["JK"] || "").trim().toUpperCase();
          let statusPerkawinan = String(row["Status Perkawinan"] || row["Status Nikah"] || "").trim().toUpperCase();
          const alamat = String(row["Alamat"] || "").trim();
          const telepon = String(row["No Telepon"] || row["Telepon"] || row["No HP"] || "").trim();
          const kelompok = String(row["No Kelompok"] || row["Kelompok"] || "").trim();

          // Normalisasi tanggal jika angka Excel serial
          if (/^\d{5}$/.test(tglLahirRaw)) {
            const excelDate = new Date((Number(tglLahirRaw) - (25567 + 2)) * 86400 * 1000);
            tglLahirRaw = excelDate.toISOString().split("T")[0];
          }

          // Validasi Nama
          if (!namaLengkap) {
            errors.push("Nama Lengkap wajib diisi");
          }

          // Validasi Tanggal Lahir (YYYY-MM-DD)
          if (!tglLahirRaw || !/^\d{4}-\d{2}-\d{2}$/.test(tglLahirRaw)) {
            errors.push("Tanggal lahir harus format YYYY-MM-DD");
          }

          // Validasi Jenis Kelamin
          if (jenisKelamin === "LAKI-LAKI" || jenisKelamin === "PRIA") jenisKelamin = "L";
          if (jenisKelamin === "PEREMPUAN" || jenisKelamin === "WANITA") jenisKelamin = "P";
          if (jenisKelamin !== "L" && jenisKelamin !== "P") {
            errors.push("Jenis kelamin harus 'L' atau 'P'");
          }

          // Validasi Status Perkawinan
          if (statusPerkawinan === "BELUM MENIKAH" || statusPerkawinan === "LAJANG") statusPerkawinan = "BELUM_MENIKAH";
          if (statusPerkawinan === "KAWIN" || statusPerkawinan === "SUDAH MENIKAH") statusPerkawinan = "MENIKAH";
          if (statusPerkawinan === "CERAI HIDUP") statusPerkawinan = "CERAI_HIDUP";
          if (statusPerkawinan === "CERAI MATI" || statusPerkawinan === "JANDA" || statusPerkawinan === "DUDA") statusPerkawinan = "CERAI_MATI";

          if (!["BELUM_MENIKAH", "MENIKAH", "CERAI_HIDUP", "CERAI_MATI"].includes(statusPerkawinan)) {
            errors.push("Status perkawinan tidak valid (pilih BELUM_MENIKAH, MENIKAH, CERAI_HIDUP, CERAI_MATI)");
          }

          // Validasi NIK jika diisi
          let nikVal: string | undefined = undefined;
          if (nikRaw) {
            if (nikRaw.length !== 16 || !/^\d+$/.test(nikRaw)) {
              errors.push("NIK harus tepat 16 digit angka");
            } else if (seenNiks.has(nikRaw)) {
              errors.push(`NIK ${nikRaw} ganda di dalam file ini`);
            } else {
              seenNiks.add(nikRaw);
              nikVal = nikRaw;
            }
          }

          // Pelka recommendation
          let pelkaNama = "";
          if (/^\d{4}-\d{2}-\d{2}$/.test(tglLahirRaw) && (jenisKelamin === "L" || jenisKelamin === "P")) {
            const rec = calculatePelkaRecommendation(tglLahirRaw, jenisKelamin, statusPerkawinan);
            pelkaNama = rec.nama_pelka;
          }

          parsed.push({
            rowNum,
            data: {
              nik: nikVal,
              nama_lengkap: namaLengkap,
              tempat_lahir: tempatLahir || undefined,
              tanggal_lahir: tglLahirRaw,
              jenis_kelamin: jenisKelamin,
              status_perkawinan: statusPerkawinan,
              alamat: alamat || undefined,
              nomor_telepon: telepon || undefined,
              nomor_kelompok: kelompok || undefined,
            },
            isValid: errors.length === 0,
            errors,
            pelkaRecommendation: pelkaNama,
          });
        });

        setParsedRows(parsed);
      } catch (err: any) {
        setImportError(`Gagal membaca file Excel: ${err.message || err}`);
        setParsedRows([]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleExecuteImport = async () => {
    const validItems = parsedRows.filter((r) => r.isValid).map((r) => r.data);
    if (validItems.length === 0) {
      setImportError("Tidak ada baris data yang valid untuk diimpor");
      return;
    }

    setIsProcessingImport(true);
    setImportError(null);
    try {
      const summary: ImportSummary = await invokeCommand("import_jemaat_batch", {
        token,
        rows: validItems,
      });
      setImportSummary(summary);
      setParsedRows([]);
      setImportFileName(null);
    } catch (err: any) {
      setImportError(`Gagal memproses impor: ${err.message || err}`);
    } finally {
      setIsProcessingImport(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">Impor & Ekspor Data Excel</h1>
          </div>
          <p className="text-sm text-gray-500">
            Ekspor data jemaat dan keluarga ke format Excel (.xlsx) atau lakukan impor jemaat massal dengan validasi offline instan.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border text-sm">
          <button
            onClick={() => setActiveTab("ekspor")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition ${
              activeTab === "ekspor"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Download className="w-4 h-4" />
            Ekspor Data
          </button>
          <button
            onClick={() => setActiveTab("impor")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition ${
              activeTab === "impor"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Upload className="w-4 h-4" />
            Impor Jemaat
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB EKSPOR */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "ekspor" && (
        <div className="space-y-6">
          {exportMessage && (
            <div
              className={`p-4 rounded-lg text-sm border flex items-center justify-between ${
                exportMessage.includes("Gagal")
                  ? "bg-red-50 text-red-800 border-red-200"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
              }`}
            >
              <span>{exportMessage}</span>
              <button onClick={() => setExportMessage(null)} className="text-xs underline font-semibold">
                Tutup
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Ekspor Jemaat */}
            <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="p-3 bg-blue-100 text-blue-800 rounded-xl">
                    <Users className="w-6 h-6" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-base">Ekspor Data Jemaat</h3>
                    <p className="text-xs text-gray-500">Format Microsoft Excel (.xlsx)</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Menghasilkan spreadsheet lengkap berisi seluruh anggota jemaat aktif, nomor anggota, NIK, tempat dan tanggal lahir, Pelka, kelompok ibadah, nomor kontak, serta alamat domisili.
                </p>
              </div>

              <Button
                onClick={handleExportJemaat}
                disabled={isExportingJemaat}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center gap-2"
              >
                {isExportingJemaat ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyiapkan Data...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Unduh Excel Jemaat (.xlsx)
                  </>
                )}
              </Button>
            </div>

            {/* Card Ekspor Keluarga */}
            <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="p-3 bg-indigo-100 text-indigo-800 rounded-xl">
                    <Home className="w-6 h-6" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-base">Ekspor Data Keluarga</h3>
                    <p className="text-xs text-gray-500">Format Microsoft Excel (.xlsx)</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Menghasilkan rekapitulasi data Kepala Keluarga, nomor kartu keluarga (KK), jumlah anggota dalam keluarga, status keluarga, dan alamat domisili jemaat.
                </p>
              </div>

              <Button
                onClick={handleExportKeluarga}
                disabled={isExportingKeluarga}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center gap-2"
              >
                {isExportingKeluarga ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyiapkan Data...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Unduh Excel Keluarga (.xlsx)
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB IMPOR */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "impor" && (
        <div className="space-y-6">
          {!isAdmin && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Akses Terbatas:</strong> Anda login sebagai Operator. Hanya Administrator yang memiliki wewenang untuk mengeksekusi impor data massal ke dalam database.
              </span>
            </div>
          )}

          {/* Panduan & Unduh Template */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
                <HelpCircle className="w-4 h-4 text-emerald-700" />
                Panduan Pengisian Template Impor Jemaat
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Pastikan nama kolom sesuai: <strong>NIK</strong> (16 digit), <strong>Nama Lengkap</strong> (Wajib), <strong>Tanggal Lahir</strong> (YYYY-MM-DD), <strong>Jenis Kelamin</strong> (L/P), <strong>Status Perkawinan</strong> (BELUM_MENIKAH/MENIKAH/CERAI_HIDUP/CERAI_MATI), dan <strong>No Kelompok</strong> (1-12). Pelka akan otomatis ditentukan oleh sistem.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100 flex items-center gap-2 flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              Unduh Template Excel
            </Button>
          </div>

          {/* Upload Area */}
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 text-sm">Pilih File Spreadsheet Excel</h3>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-emerald-500 transition cursor-pointer bg-gray-50/50 relative">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={!isAdmin}
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-full">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {importFileName ? (
                    <span className="text-emerald-700 font-bold">{importFileName}</span>
                  ) : (
                    "Klik untuk memilih atau seret file Excel (.xlsx / .xls) ke sini"
                  )}
                </div>
                <p className="text-xs text-gray-500">Maksimum data 1.000 baris per sekali impor</p>
              </div>
            </div>

            {importError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                <span>{importError}</span>
              </div>
            )}

            {importSummary && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Impor Jemaat Berhasil Dilakukan!
                </div>
                <p className="text-xs">
                  Total data dikirim: <strong>{importSummary.total_submitted}</strong> | Berhasil dimasukkan ke database:{" "}
                  <strong>{importSummary.total_inserted}</strong> jemaat.
                </p>
                {importSummary.failed_records.length > 0 && (
                  <div className="mt-2 text-xs bg-white p-3 rounded border border-emerald-200 text-red-700 max-h-32 overflow-y-auto">
                    <strong>Catatan baris yang dilewati:</strong>
                    <ul className="list-disc pl-5 mt-1 space-y-0.5">
                      {importSummary.failed_records.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Pratinjau & Validasi Data Impor</h3>
                  <p className="text-xs text-gray-500">
                    Total: {parsedRows.length} baris |{" "}
                    <span className="text-emerald-700 font-semibold">{validCount} Valid</span> |{" "}
                    <span className="text-red-700 font-semibold">{invalidCount} Bermasalah</span>
                  </p>
                </div>

                <Button
                  onClick={handleExecuteImport}
                  disabled={validCount === 0 || isProcessingImport || !isAdmin}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-2"
                >
                  {isProcessingImport ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memproses Impor...
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      Proses Impor ({validCount} Data Valid)
                    </>
                  )}
                </Button>
              </div>

              <div className="border rounded-lg overflow-x-auto max-h-96">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b text-gray-600 font-medium sticky top-0">
                    <tr>
                      <th className="px-3 py-2 w-12 text-center">Baris</th>
                      <th className="px-3 py-2 w-28">Status</th>
                      <th className="px-3 py-2">Nama Lengkap</th>
                      <th className="px-3 py-2">NIK</th>
                      <th className="px-3 py-2">Tgl Lahir</th>
                      <th className="px-3 py-2">JK</th>
                      <th className="px-3 py-2">Status Nikah</th>
                      <th className="px-3 py-2">Pelka Rekomendasi</th>
                      <th className="px-3 py-2">Kelompok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-gray-700">
                    {parsedRows.map((item) => (
                      <tr
                        key={item.rowNum}
                        className={item.isValid ? "hover:bg-gray-50/50" : "bg-red-50/40 hover:bg-red-50/60"}
                      >
                        <td className="px-3 py-2 text-center text-gray-500 font-mono">{item.rowNum}</td>
                        <td className="px-3 py-2">
                          {item.isValid ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Valid</Badge>
                          ) : (
                            <div className="space-y-0.5">
                              <Badge className="bg-red-100 text-red-800 border-red-300">Bermasalah</Badge>
                              {item.errors.map((e, idx) => (
                                <p key={idx} className="text-[10px] text-red-600 leading-tight">
                                  {e}
                                </p>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-900">{item.data.nama_lengkap || "-"}</td>
                        <td className="px-3 py-2 font-mono">{item.data.nik || "-"}</td>
                        <td className="px-3 py-2 font-mono">{item.data.tanggal_lahir || "-"}</td>
                        <td className="px-3 py-2">{item.data.jenis_kelamin || "-"}</td>
                        <td className="px-3 py-2">{item.data.status_perkawinan || "-"}</td>
                        <td className="px-3 py-2 font-semibold text-emerald-800">
                          {item.pelkaRecommendation || "-"}
                        </td>
                        <td className="px-3 py-2">
                          {item.data.nomor_kelompok ? `Kelompok ${item.data.nomor_kelompok}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
