"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  Home,
  Layers,
  HeartHandshake,
  Cake,
  AlertTriangle,
  History,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Phone,
} from "lucide-react";
import { useAuth, getAuthToken } from "@/lib/auth-context";
import { invokeCommand } from "@/lib/tauri";
import { DashboardSummary } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateIndo } from "@/lib/utils";

function getNearestSundayStr(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function getNextSundayStr(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? 7 : 7 - day) + 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function addDaysStr(dateStr: string, days: number): string {
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
}

export function DashboardView() {
  const { token: ctxToken, user } = useAuth();
  const token = ctxToken || getAuthToken();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // HUT Date Filter
  const [refDate, setRefDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [filterMode, setFilterMode] = useState<"today" | "sunday_this" | "sunday_next" | "custom">("today");

  const fetchSummary = async (dateParam?: string) => {
    const targetDate = dateParam !== undefined ? dateParam : refDate;
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await invokeCommand<DashboardSummary>("get_dashboard_summary", {
        token,
        ref_date: targetDate || undefined,
        refDate: targetDate || undefined,
      });
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [token]);

  const isAdmin = user?.role === "ADMIN";

  if (isLoading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-muted-foreground">Memuat data dashboard lokal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-5 w-5" />
          <span>Gagal memuat ringkasan dashboard</span>
        </div>
        <p className="mt-1 text-sm">{error}</p>
        <Button onClick={() => fetchSummary()} variant="outline" size="sm" className="mt-4">
          Coba Lagi
        </Button>
      </div>
    );
  }

  const totalJemaat = data?.total_jemaat_aktif || 0;

  return (
    <div className="space-y-6">
      {/* Top Banner: Invariant Rules */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100 flex items-start justify-between shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white mt-0.5">
            <HeartHandshake className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Prinsip Pelka: Rekomendasi Sistem Bukan Perubahan Otomatis</h3>
            <p className="text-xs text-blue-800 dark:text-blue-200 mt-0.5 leading-relaxed">
              Sistem menghitung rekomendasi Pelka secara dinamis berdasarkan usia dan status perkawinan.
              <strong> Pelka aktual jemaat tidak pernah berganti otomatis</strong> saat ulang tahun atau pergantian tahun. Perubahan Pelka hanya berlaku jika Admin melakukan peninjauan dan konfirmasi perubahan secara eksplisit.
            </p>
          </div>
        </div>
        <Button onClick={() => fetchSummary()} variant="outline" size="sm" className="shrink-0 h-8 gap-1.5 ml-4">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Perbarui</span>
        </Button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jemaat Aktif</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{data?.total_jemaat_aktif || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Jiwa terdaftar di GMIST Maranatha</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Keluarga Terdaftar</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              <Home className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{data?.total_keluarga_aktif || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Kartu Keluarga jemaat aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kelompok Ibadah</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{data?.total_kelompok || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Kelompok rumah tangga wilayah</p>
          </CardContent>
        </Card>

        <Card className={data?.pending_pelka_reviews ? "border-amber-300 dark:border-amber-800" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Review Pelka Baru</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {data?.pending_pelka_reviews || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isAdmin ? "Jemaat memenuhi kriteria Pelka baru" : "Menunggu peninjauan Admin"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Grid: Pelka Distribution & Upcoming Birthdays */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Actual Pelka Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Distribusi Pelka Aktual</CardTitle>
                <CardDescription>Berdasarkan penetapan Pelka tersimpan pada data jemaat</CardDescription>
              </div>
              <Badge variant="outline">Aktual</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.pelka_distribution.map((item) => {
                const pct = totalJemaat > 0 ? Math.round((item.count / totalJemaat) * 100) : 0;
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{item.label}</span>
                      <span className="text-muted-foreground">
                        {item.count} jiwa ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Birthdays */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cake className="h-5 w-5 text-pink-500" />
                <div>
                  <CardTitle className="text-base font-bold">HUT Warga Jemaat</CardTitle>
                  <CardDescription>
                    Rentang: <strong>{formatDateIndo(refDate)}</strong> s/d{" "}
                    <strong>{formatDateIndo(addDaysStr(refDate, 7))}</strong>
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="self-start sm:self-auto font-mono">
                {data?.upcoming_birthdays.length || 0} Jemaat
              </Badge>
            </div>

            {/* Quick Date Filters for GMIST Warta Jemaat */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t mt-2">
              <Button
                type="button"
                size="sm"
                variant={filterMode === "today" ? "default" : "outline"}
                className="h-7 text-xs px-2.5"
                onClick={() => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  setFilterMode("today");
                  setRefDate(todayStr);
                  fetchSummary(todayStr);
                }}
              >
                Hari Ini
              </Button>

              <Button
                type="button"
                size="sm"
                variant={filterMode === "sunday_this" ? "default" : "outline"}
                className="h-7 text-xs px-2.5"
                onClick={() => {
                  const sunStr = getNearestSundayStr();
                  setFilterMode("sunday_this");
                  setRefDate(sunStr);
                  fetchSummary(sunStr);
                }}
              >
                Hari Minggu Ini (Warta)
              </Button>

              <Button
                type="button"
                size="sm"
                variant={filterMode === "sunday_next" ? "default" : "outline"}
                className="h-7 text-xs px-2.5"
                onClick={() => {
                  const nextSunStr = getNextSundayStr();
                  setFilterMode("sunday_next");
                  setRefDate(nextSunStr);
                  fetchSummary(nextSunStr);
                }}
              >
                Minggu Depan
              </Button>

              <div className="flex items-center gap-1.5 ml-auto">
                <Input
                  type="date"
                  value={refDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      setFilterMode("custom");
                      setRefDate(val);
                      fetchSummary(val);
                    }
                  }}
                  className="h-7 text-xs w-36 px-2 py-0"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {(!data?.upcoming_birthdays || data.upcoming_birthdays.length === 0) ? (
              <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground">
                <Calendar className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-xs">Tidak ada jemaat yang berulang tahun dalam 7 hari ke depan.</p>
              </div>
            ) : (
              <div className="divide-y divide-border overflow-hidden rounded-md border">
                {data.upcoming_birthdays.map((bday) => (
                  <div key={bday.jemaat_id} className="flex items-center justify-between p-3 text-xs hover:bg-muted/40 transition-colors">
                    <div>
                      <div className="font-semibold text-foreground">{bday.nama_lengkap}</div>
                      <div className="text-muted-foreground flex items-center gap-2 mt-0.5 text-[11px]">
                        <span>Lahir: {formatDateIndo(bday.tanggal_lahir)}</span>
                        <span>•</span>
                        <span>{bday.kelompok}</span>
                        <span>•</span>
                        <span>{bday.pelka}</span>
                      </div>
                      {bday.nomor_telepon && (
                        <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                          <Phone className="h-3 w-3" />
                          <span>{bday.nomor_telepon}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <Badge variant={bday.hari_lagi === 0 ? "success" : "default"} className="text-[11px]">
                        {bday.hari_lagi === 0 ? "Hari Ini!" : `${bday.hari_lagi} hari lagi`}
                      </Badge>
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                        Ke-{bday.usia_akan_dicapai} thn
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Kelompok Distribution & Recent Audit Logs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Kelompok Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Distribusi Kelompok Ibadah</CardTitle>
            <CardDescription>Jumlah jemaat aktif pada masing-masing kelompok rukun</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {data?.kelompok_distribution.map((k) => (
                <div key={k.label} className="p-3 rounded-md border bg-card text-center hover:border-blue-300 transition-colors">
                  <div className="text-xs font-semibold text-foreground">{k.label}</div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">{k.count}</div>
                  <div className="text-[10px] text-muted-foreground">jiwa</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Audit Log (Admin Only) or Operator Guidance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-base font-bold">Aktivitas Administrasi Terbaru</CardTitle>
                  <CardDescription>Catatan audit log sistem lokal</CardDescription>
                </div>
              </div>
              <Badge variant={isAdmin ? "default" : "secondary"}>
                {isAdmin ? "Audit Log Admin" : "Mode Operator"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {!isAdmin ? (
              <div className="flex h-48 flex-col items-center justify-center p-4 text-center">
                <ShieldCheck className="h-10 w-10 text-muted-foreground/60 mb-2" />
                <h4 className="text-sm font-semibold text-foreground">Akses Terlindungi</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Riwayat audit lengkap, backup, impor/ekspor, dan mutasi data arsip dikelola secara terpusat oleh Administrator. Anda masuk sebagai Operator untuk tugas pencarian dan registrasi anggota baru.
                </p>
              </div>
            ) : (!data?.recent_audits || data.recent_audits.length === 0) ? (
              <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
                Belum ada aktivitas audit yang tercatat.
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.recent_audits.map((audit) => (
                  <div key={audit.id} className="flex items-start justify-between p-2.5 rounded-md border bg-muted/20 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 uppercase font-mono">
                          {audit.action}
                        </Badge>
                        <span className="font-semibold text-foreground">{audit.summary}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Oleh: <span className="font-medium text-foreground">{audit.username}</span> ({audit.role})
                        {audit.reason && ` • Alasan: ${audit.reason}`}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {new Date(audit.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
