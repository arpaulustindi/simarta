@echo off
setlocal enabledelayedexpansion
title SiMarta - Build Installer Desktop Windows

echo ========================================================
echo        SiMarta - GMIST Maranatha Tahuna
echo   Script Otomatisasi Build Installer Desktop Windows
echo ========================================================
echo.

:: 1. Cek Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js belum terpasang.
    echo Silakan unduh dan pasang Node.js LTS dari https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Cek Rust / Cargo
where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Rust (Cargo) belum terpasang.
    echo Silakan unduh dan pasang Rust dari https://rustup.rs/ (pilih toolchain MSVC).
    pause
    exit /b 1
)

:: 3. Cek pnpm
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] pnpm belum terpasang. Menginstal pnpm via npm...
    call npm install -g pnpm
)

echo [1/3] Menginstal dependensi frontend...
call pnpm install
if %errorlevel% neq 0 (
    echo [ERROR] Gagal menginstal dependensi frontend.
    pause
    exit /b 1
)

echo.
echo [2/3] Mengompilasi Next.js dan Tauri Desktop Windows...
echo Proses ini membutuhkan waktu 2-5 menit...
call pnpm tauri build
if %errorlevel% neq 0 (
    echo [ERROR] Proses build installer gagal. Periksa log di atas.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo [3/3] BERHASIL! Installer Desktop Windows SiMarta Selesai!
echo ========================================================
echo.
echo Lokasi File Installer:
echo   NSIS (.exe): src-tauri\target\release\bundle\nsis\
echo   MSI (.msi) : src-tauri\target\release\bundle\msi\
echo   Executable : src-tauri\target\release\simarta.exe
echo.
echo Membuka folder installer di File Explorer...
if exist "src-tauri\target\release\bundle\nsis" (
    explorer "src-tauri\target\release\bundle\nsis"
) else (
    explorer "src-tauri\target\release"
)

pause
