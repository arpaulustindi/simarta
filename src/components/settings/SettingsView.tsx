"use client";

import React, { useState, useEffect, useCallback } from "react";
import { invokeCommand } from "@/lib/tauri";
import { useAuth, getAuthToken } from "@/lib/auth-context";
import { AuthUser, DataSummaryResult } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Settings,
  Users,
  KeyRound,
  Church,
  ShieldCheck,
  UserPlus,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  HardDrive,
  Info,
  Database,
  Trash2,
  RotateCcw,
} from "lucide-react";

export function SettingsView() {
  const { user, token: ctxToken } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const token = ctxToken || getAuthToken();

  const [activeTab, setActiveTab] = useState<"users" | "data" | "password" | "church">("users");

  // Data Management states
  const [dataSummary, setDataSummary] = useState<DataSummaryResult | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [confirmClearText, setConfirmClearText] = useState("");
  const [isClearingData, setIsClearingData] = useState(false);
  const [isSeedingData, setIsSeedingData] = useState(false);

  // User Management states
  const [usersList, setUsersList] = useState<AuthUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "OPERATOR">("OPERATOR");
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Reset Password states (by Admin)
  const [selectedUserForReset, setSelectedUserForReset] = useState<AuthUser | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Change Password states (Self)
  const [oldPassword, setOldPassword] = useState("");
  const [selfNewPassword, setSelfNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingSelfPassword, setIsChangingSelfPassword] = useState(false);

  // Status banners
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoadingUsers(true);
    try {
      const data: AuthUser[] = await invokeCommand("list_users", { token });
      setUsersList(data || []);
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `Gagal memuat daftar pengguna: ${err.message || err}` });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    } else {
      setActiveTab("password");
    }
  }, [isAdmin, loadUsers]);

  // -------------------------------------------------------------
  // USER MANAGEMENT HANDLERS
  // -------------------------------------------------------------
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || newPassword.length < 8 || !newFullName.trim()) {
      setStatusMessage({ type: "error", text: "Lengkapi semua data. Password minimal 8 karakter." });
      return;
    }

    setIsCreatingUser(true);
    setStatusMessage(null);
    try {
      await invokeCommand("create_user", {
        token,
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
        fullName: newFullName.trim(),
        full_name: newFullName.trim(),
      });
      setStatusMessage({
        type: "success",
        text: `Pengguna baru "${newUsername.trim()}" (${newRole}) berhasil dibuat.`,
      });
      setIsAddUserModalOpen(false);
      setNewUsername("");
      setNewPassword("");
      setNewFullName("");
      setNewRole("OPERATOR");
      await loadUsers();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `Gagal membuat pengguna: ${err.message || err}` });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleToggleUserStatus = async (targetUser: AuthUser) => {
    const nextStatus = !targetUser.is_active;
    setStatusMessage(null);
    try {
      await invokeCommand("update_user_status", {
        token,
        targetUserId: targetUser.id,
        target_user_id: targetUser.id,
        userId: targetUser.id,
        user_id: targetUser.id,
        isActive: nextStatus,
        is_active: nextStatus,
      });
      setStatusMessage({
        type: "success",
        text: `Status akun "${targetUser.username}" berhasil diubah menjadi ${nextStatus ? "Aktif" : "Nonaktif"}.`,
      });
      await loadUsers();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `Gagal mengubah status: ${err.message || err}` });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset || resetNewPassword.length < 8) {
      setStatusMessage({ type: "error", text: "Password baru minimal 8 karakter." });
      return;
    }

    setIsResetting(true);
    setStatusMessage(null);
    try {
      await invokeCommand("reset_user_password", {
        token,
        userId: selectedUserForReset.id,
        user_id: selectedUserForReset.id,
        newPassword: resetNewPassword,
        new_password: resetNewPassword,
      });
      setStatusMessage({
        type: "success",
        text: `Password untuk akun "${selectedUserForReset.username}" berhasil direset.`,
      });
      setSelectedUserForReset(null);
      setResetNewPassword("");
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `Gagal mereset password: ${err.message || err}` });
    } finally {
      setIsResetting(false);
    }
  };

  // -------------------------------------------------------------
  // SELF CHANGE PASSWORD HANDLER
  // -------------------------------------------------------------
  const handleChangeSelfPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      setStatusMessage({ type: "error", text: "Masukkan kata sandi lama Anda." });
      return;
    }
    if (selfNewPassword.length < 8) {
      setStatusMessage({ type: "error", text: "Kata sandi baru minimal 8 karakter." });
      return;
    }
    if (selfNewPassword !== confirmNewPassword) {
      setStatusMessage({ type: "error", text: "Konfirmasi kata sandi baru tidak cocok." });
      return;
    }

    setIsChangingSelfPassword(true);
    setStatusMessage(null);
    try {
      await invokeCommand("change_password", {
        token,
        oldPassword: oldPassword,
        old_password: oldPassword,
        newPassword: selfNewPassword,
        new_password: selfNewPassword,
      });
      setStatusMessage({ type: "success", text: "Kata sandi Anda berhasil diperbarui." });
      setOldPassword("");
      setSelfNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `Gagal mengubah kata sandi: ${err.message || err}` });
    } finally {
      setIsChangingSelfPassword(false);
    }
  };

  // -------------------------------------------------------------
  // DUMMY DATA MANAGEMENT HANDLERS
  // -------------------------------------------------------------
  const loadDataSummary = useCallback(async () => {
    if (!token) return;
    setIsLoadingSummary(true);
    try {
      const summary = await invokeCommand<DataSummaryResult>("get_data_summary", { token });
      setDataSummary(summary);
    } catch (err: any) {
      console.error("Gagal memuat ringkasan data:", err);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "data") {
      loadDataSummary();
    }
  }, [activeTab, loadDataSummary]);

  const handleClearDummyData = async () => {
    if (confirmClearText.trim().toUpperCase() !== "KOSONGKAN") {
      setStatusMessage({ type: "error", text: "Ketik kata 'KOSONGKAN' dengan benar untuk konfirmasi." });
      return;
    }
    setIsClearingData(true);
    setStatusMessage(null);
    try {
      await invokeCommand("clear_dummy_data", { token });
      setStatusMessage({
        type: "success",
        text: "Seluruh data dummy jemaat, keluarga, dan catatan gerejawi berhasil dikosongkan. Basis data kini bersih untuk data riil.",
      });
      setIsClearModalOpen(false);
      setConfirmClearText("");
      await loadDataSummary();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `Gagal mengosongkan data dummy: ${err.message || err}` });
    } finally {
      setIsClearingData(false);
    }
  };

  const handleSeedDummyData = async () => {
    setIsSeedingData(true);
    setStatusMessage(null);
    try {
      await invokeCommand("seed_dummy_data_cmd", { token });
      setStatusMessage({
        type: "success",
        text: "Data dummy contoh GMIST Maranatha Tahuna (10 jemaat, 3 keluarga, peristiwa) berhasil dimuat kembali.",
      });
      await loadDataSummary();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: `Gagal memuat data dummy: ${err.message || err}` });
    } finally {
      setIsSeedingData(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-slate-100 text-slate-800 rounded-lg">
              <Settings className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">Pengaturan Sistem & Profil</h1>
          </div>
          <p className="text-sm text-gray-500">
            Kelola akun pengguna, keamanan kata sandi, dan informasi identitas GMIST Maranatha Tahuna.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border text-sm flex-wrap">
          {isAdmin && (
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition text-xs ${
                activeTab === "users"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Manajemen Pengguna
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setActiveTab("data")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition text-xs ${
                activeTab === "data"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Pengelolaan Data Dummy
            </button>
          )}
          <button
            onClick={() => setActiveTab("password")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition text-xs ${
              activeTab === "password"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Kata Sandi Saya
          </button>
          <button
            onClick={() => setActiveTab("church")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition text-xs ${
              activeTab === "church"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Church className="w-3.5 h-3.5" />
            Profil Gereja & Info
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-sm border flex items-center justify-between ${
            statusMessage.type === "error"
              ? "bg-red-50 text-red-800 border-red-200"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "error" ? (
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-xs font-semibold underline">
            Tutup
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: MANAJEMEN PENGGUNA (ADMIN ONLY) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "users" && isAdmin && (
        <div className="space-y-6">
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Daftar Akun Pengguna</h3>
                <p className="text-xs text-gray-500">
                  Role ADMIN memiliki akses penuh ke seluruh modul. Role OPERATOR dapat mengelola data jemaat, keluarga, dan mencatat peristiwa gerejawi.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadUsers}
                  disabled={isLoadingUsers}
                  className="text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoadingUsers ? "animate-spin" : ""}`} />
                  Segarkan
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Tambah Pengguna
                </Button>
              </div>
            </div>

            {isLoadingUsers ? (
              <div className="py-12 flex justify-center items-center text-gray-500 text-xs">
                <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-600" />
                Memuat data pengguna...
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b text-gray-600 font-medium">
                    <tr>
                      <th className="px-4 py-3">Username</th>
                      <th className="px-4 py-3">Nama Lengkap</th>
                      <th className="px-4 py-3">Peran (Role)</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-gray-700">
                    {usersList.map((u) => {
                      const isSelf = user?.id === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-gray-50/60 transition">
                          <td className="px-4 py-3 font-mono font-medium text-gray-900">
                            {u.username}
                            {isSelf && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] ml-2">
                                Akun Anda
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">{u.full_name}</td>
                          <td className="px-4 py-3">
                            {u.role === "ADMIN" ? (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-300">ADMIN</Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-300">OPERATOR</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {u.is_active ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Aktif</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 border-red-300">Nonaktif</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUserForReset(u);
                                setResetNewPassword("");
                              }}
                              className="text-xs"
                            >
                              <KeyRound className="w-3 h-3 mr-1" />
                              Reset Sandi
                            </Button>

                            {!isSelf && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleUserStatus(u)}
                                className={`text-xs ${
                                  u.is_active
                                    ? "text-red-700 border-red-300 hover:bg-red-50"
                                    : "text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                }`}
                              >
                                {u.is_active ? "Nonaktifkan" : "Aktifkan"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB: PENGELOLAAN DATA DUMMY & TRANSAKSIONAL */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "data" && isAdmin && (
        <div className="space-y-6">
          {/* Ringkasan Status Data */}
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-3">
                <span className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Database className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Status Data Transaksional Sistem</h3>
                  <p className="text-xs text-gray-500">
                    Ringkasan jumlah data jemaat, keluarga, dan catatan gerejawi di database lokal.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadDataSummary}
                disabled={isLoadingSummary}
                className="flex items-center gap-1.5 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSummary ? "animate-spin" : ""}`} />
                Segarkan Status
              </Button>
            </div>

            {isLoadingSummary ? (
              <div className="p-8 text-center text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                <p className="text-xs">Memeriksa status data...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div className="p-4 bg-slate-50 border rounded-xl">
                  <p className="text-xs text-gray-500">Total Warga Jemaat</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{dataSummary?.total_jemaat ?? 0}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Jemaat aktif terdaftar</p>
                </div>
                <div className="p-4 bg-slate-50 border rounded-xl">
                  <p className="text-xs text-gray-500">Total Kartu Keluarga</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{dataSummary?.total_keluarga ?? 0}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Kepala keluarga & anggota</p>
                </div>
                <div className="p-4 bg-slate-50 border rounded-xl">
                  <p className="text-xs text-gray-500">Peristiwa Gerejawi</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{dataSummary?.total_peristiwa ?? 0}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Baptis, Sidi, Perkawinan</p>
                </div>
                <div className="p-4 bg-slate-50 border rounded-xl">
                  <p className="text-xs text-gray-500">Pejabat Pelayanan</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{dataSummary?.total_pejabat ?? 0}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Penatua, Diaken, Pelka</p>
                </div>
              </div>
            )}
          </div>

          {/* Kotak Tindakan Pengelolaan Data Dummy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Kosongkan Data Dummy (Danger Action) */}
            <div className="bg-red-50/50 border border-red-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-red-200">
                <span className="p-3 bg-red-100 text-red-700 rounded-xl">
                  <Trash2 className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="font-bold text-red-950 text-base">Kosongkan Seluruh Data Dummy</h3>
                  <p className="text-xs text-red-700/80">Inisialisasi basis data bersih untuk data riil GMIST</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-red-900/90 leading-relaxed">
                <p>
                  Gunakan fitur ini apabila Anda telah selesai melakukan pengujian atau demonstrasi aplikasi dan ingin <strong>mengosongkan seluruh data dummy contoh</strong> (data jemaat, keluarga, peristiwa sakramen, dan riwayat jabatan).
                </p>
                <div className="p-3 bg-white/80 border border-red-200 rounded-lg space-y-1">
                  <p className="font-semibold text-red-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Data yang AMAN & TETAP DIPERTAHANKAN:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 pl-1 space-y-0.5">
                    <li>Akun pengguna & sesi login Administrator</li>
                    <li>Master 12 Kelompok Ibadah GMIST Maranatha</li>
                    <li>Master 6 Kategori Pelayanan Kategorial (Pelka)</li>
                    <li>Master 8 Jabatan Pelayanan Gerejawi</li>
                  </ul>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => setIsClearModalOpen(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Kosongkan Seluruh Data Dummy
                </Button>
              </div>
            </div>

            {/* Card 2: Muat Ulang Data Dummy (Simulasi / Testing) */}
            <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b">
                <span className="p-3 bg-blue-100 text-blue-700 rounded-xl">
                  <RotateCcw className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Muat Ulang Data Dummy (Contoh)</h3>
                  <p className="text-xs text-gray-500">Memuat kembali dataset simulasi untuk demonstrasi</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
                <p>
                  Jika Anda ingin mendemonstrasikan aplikasi kepada Majelis Jemaat atau melakukan simulasi alur kerja sistem, Anda dapat memuat kembali dataset dummy GMIST Maranatha Tahuna secara instan.
                </p>
                <div className="p-3 bg-gray-50 border rounded-lg space-y-1">
                  <p className="font-semibold text-gray-800">Dataset yang akan dimuat:</p>
                  <ul className="list-disc list-inside text-gray-600 pl-1 space-y-0.5">
                    <li>10 Jemaat representatif (Anak, Remaja, Pemuda, Bapak, Ibu, Lansia)</li>
                    <li>3 Kartu Keluarga lengkap dengan hubungan keluarga</li>
                    <li>Catatan sakramen Baptis, Sidi, dan Perkawinan</li>
                    <li>Pejabat aktif Penatua, Diaken, dan Ketua Pelka</li>
                  </ul>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={handleSeedDummyData}
                  disabled={isSeedingData}
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50 flex items-center justify-center gap-2"
                >
                  {isSeedingData ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memuat Dataset Dummy...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Muat Ulang Data Dummy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB: KATA SANDI PRIBADI */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "password" && (
        <div className="bg-white border rounded-xl p-6 shadow-sm max-w-lg mx-auto space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b">
            <span className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
              <Lock className="w-6 h-6" />
            </span>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Ubah Kata Sandi Pribadi</h3>
              <p className="text-xs text-gray-500">Perbarui kata sandi login untuk akun: <strong>{user?.username}</strong></p>
            </div>
          </div>

          <form onSubmit={handleChangeSelfPassword} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Kata Sandi Saat Ini</label>
              <Input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Masukkan kata sandi lama"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Kata Sandi Baru (Min. 8 karakter)</label>
              <Input
                type="password"
                value={selfNewPassword}
                onChange={(e) => setSelfNewPassword(e.target.value)}
                placeholder="Masukkan kata sandi baru"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700">Konfirmasi Kata Sandi Baru</label>
              <Input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isChangingSelfPassword}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center gap-2 pt-2"
            >
              {isChangingSelfPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan Perubahan...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Simpan Kata Sandi Baru
                </>
              )}
            </Button>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: PROFIL GEREJA & INFO APLIKASI */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "church" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identitas Gereja */}
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b">
              <span className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
                <Church className="w-6 h-6" />
              </span>
              <div>
                <h3 className="font-bold text-gray-900 text-base">GMIST Maranatha Tahuna</h3>
                <p className="text-xs text-gray-500">Gereja Masehi Injili Sangihe Talaud</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-700">
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-gray-500">Resort Pelayanan</span>
                <span className="font-medium text-gray-900">Resort Tahuna I</span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-gray-500">Jumlah Kelompok Ibadah</span>
                <span className="font-medium text-gray-900">12 Kelompok</span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-gray-500">Pelayanan Kategorial (Pelka)</span>
                <span className="font-medium text-gray-900">Anak, Remaja, Pemuda, PKB, WKI, Lansia</span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-gray-500">Wilayah Domisili</span>
                <span className="font-medium text-gray-900">Tahuna, Kab. Kepulauan Sangihe</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Provinsi</span>
                <span className="font-medium text-gray-900">Sulawesi Utara, Indonesia</span>
              </div>
            </div>
          </div>

          {/* Spesifikasi Aplikasi SiMarta */}
          <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b">
              <span className="p-3 bg-blue-100 text-blue-800 rounded-xl">
                <HardDrive className="w-6 h-6" />
              </span>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Spesifikasi Aplikasi SiMarta</h3>
                <p className="text-xs text-gray-500">Sistem Informasi Jemaat GMIST Maranatha</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-700">
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-gray-500">Versi Rilis</span>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">v1.0.0 Standalone</Badge>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-gray-500">Mode Eksekusi</span>
                <span className="font-semibold text-emerald-700">100% Offline (Local-First)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-gray-500">Mesin Database</span>
                <span className="font-medium text-gray-900">SQLite 3 (WAL Journal Mode)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-gray-500">Desktop Runtime</span>
                <span className="font-medium text-gray-900">Tauri 2.0 (Rust) + Next.js 14 SSG</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Enkripsi Kata Sandi</span>
                <span className="font-medium text-gray-900">Argon2id (OWASP Certified)</span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border text-[11px] text-gray-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                Aplikasi ini tidak mengirimkan data keluar komputer (Zero External Telemetry). Semua data jemaat sepenuhnya tersimpan di disk lokal komputer ini.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Pengguna Baru */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-gray-900 text-base">Tambah Akun Pengguna</h3>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Username</label>
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Contoh: operator1"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Nama Lengkap</label>
                <Input
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Nama lengkap pengguna"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Peran Akun (Role)</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "ADMIN" | "OPERATOR")}
                  className="w-full border rounded-lg p-2 bg-white text-gray-800"
                >
                  <option value="OPERATOR">OPERATOR (Entri & Pengelolaan Data)</option>
                  <option value="ADMIN">ADMIN (Hak Akses Penuh Termasuk Backup)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Kata Sandi Awal (Min. 8 Karakter)</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  required
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddUserModalOpen(false)}
                  disabled={isCreatingUser}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingUser}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5"
                >
                  {isCreatingUser ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Membuat Akun...
                    </>
                  ) : (
                    "Buat Pengguna"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Kata Sandi User */}
      {selectedUserForReset && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <KeyRound className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Reset Kata Sandi Akun</h3>
                  <p className="text-xs text-gray-500 font-mono">{selectedUserForReset.username}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForReset(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <p className="text-gray-600 leading-relaxed">
                Masukkan kata sandi baru untuk <strong>{selectedUserForReset.full_name}</strong>. Sesi aktif pengguna ini akan otomatis dicabut dan pengguna harus login ulang dengan sandi baru.
              </p>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Kata Sandi Baru (Min. 8 Karakter)</label>
                <Input
                  type="password"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  required
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedUserForReset(null)}
                  disabled={isResetting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isResetting}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Mereset Sandi...
                    </>
                  ) : (
                    "Reset Kata Sandi"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Bahaya: Kosongkan Seluruh Data Dummy */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-red-100 text-red-700 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Konfirmasi Kosongkan Data</h3>
                  <p className="text-xs text-red-600">Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsClearModalOpen(false);
                  setConfirmClearText("");
                }}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
              <p>
                Anda akan <strong>menghapus seluruh data jemaat, keluarga, dan catatan gerejawi</strong> yang saat ini ada di aplikasi.
              </p>
              <p className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 font-medium">
                Untuk mencegah ketidaksengajaan, ketik kata <span className="font-mono font-bold tracking-wider text-red-900 bg-red-100 px-1 py-0.5 rounded">KOSONGKAN</span> pada kolom di bawah ini:
              </p>

              <div className="space-y-1">
                <Input
                  type="text"
                  value={confirmClearText}
                  onChange={(e) => setConfirmClearText(e.target.value)}
                  placeholder="Ketik KOSONGKAN"
                  className="font-mono text-center tracking-wider font-semibold uppercase"
                  autoFocus
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsClearModalOpen(false);
                    setConfirmClearText("");
                  }}
                  disabled={isClearingData}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleClearDummyData}
                  disabled={confirmClearText.trim().toUpperCase() !== "KOSONGKAN" || isClearingData}
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5"
                >
                  {isClearingData ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Mengosongkan Data...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Ya, Kosongkan Sekarang
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

