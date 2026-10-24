"use client";

import React, { useState } from "react";
import { Shield, Church, UserCheck, AlertCircle, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function SetupWizard() {
  const { setupAdmin } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Nama lengkap Administrator wajib diisi");
      return;
    }
    if (username.trim().length < 3) {
      setError("Username minimal 3 karakter");
      return;
    }
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter demi keamanan");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok");
      return;
    }

    setIsSubmitting(true);
    try {
      await setupAdmin(username.trim(), password, fullName.trim());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-900">
      <Card className="w-full max-w-lg shadow-xl border-blue-200 dark:border-blue-900">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
            <Church className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-blue-950 dark:text-blue-100">
            Inisialisasi Sistem SiMarta
          </CardTitle>
          <CardDescription className="text-sm pt-1">
            GMIST Maranatha Tahuna — Konfigurasi Pertama Administrator
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-blue-50 p-3.5 text-xs text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 border border-blue-200 dark:border-blue-800 flex items-start gap-2.5">
              <Shield className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold">Prinsip Keamanan Tanpa Password Bawaan:</span>
                <p className="leading-relaxed">
                  Aplikasi ini tidak memiliki username/password default. Buat akun Administrator utama gereja yang akan memegang otoritas penuh pengelolaan data, persetujuan Pelka, dan audit log.
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Nama Lengkap Petugas Administrator
              </label>
              <Input
                placeholder="Contoh: Pnt. John Doe, S.Th"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Username Administrator</label>
              <Input
                placeholder="Contoh: admin_maranatha"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Kata Sandi (Min. 8 Karakter)</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Konfirmasi Kata Sandi</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-2 flex flex-col gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2"
            >
              <UserCheck className="h-4 w-4" />
              <span>{isSubmitting ? "Menyimpan Administrator..." : "Buat Akun Administrator & Mulai"}</span>
            </Button>
            <span className="text-[11px] text-muted-foreground text-center">
              Database SQLite lokal: 100% offline di komputer ini.
            </span>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
