# SiMarta (Sistem Informasi GMIST Maranatha Tahuna)
## Aplikasi Desktop Standalone & 100% Offline

Aplikasi Sistem Informasi Manajemen Jemaat untuk GMIST (Gereja Masehi Injili Sangihe Talaud) Jemaat Maranatha Tahuna. Dibangun dengan fokus pada kehandalan offline, privasi data lokal (local-first), integritas riwayat gerejawi, dan kemudahan administrasi.

---

## 🌟 Fitur Utama
1. **Full Offline & Local-First**: Bekerja 100% tanpa internet, tanpa cloud, dan tanpa runtime server eksternal.
2. **Manajemen Jemaat & Keluarga**: Pendataan lengkap jemaat, nomor anggota unik, NIK, kartu keluarga, dan relasi keluarga.
3. **Mesin Rekomendasi Pelka (Suggestion Only)**:
   - Rekomendasi Pelka (Anak, Remaja, Pemuda, Bapak, Ibu, Lansia) dihitung secara murni berdasarkan usia, jenis kelamin, dan status perkawinan.
   - **Tidak ada perubahan otomatis**: Keputusan perubahan Pelka aktual berada di tangan Admin secara eksplisit.
4. **Keamanan Berbasis Role (RBAC di Backend)**:
   - **Admin**: Akses penuh ke master data, koreksi, persetujuan Pelka, manajemen akun, backup/restore, dan audit log.
   - **Operator**: Akses input data baru, pencarian, dan pendaftaran peristiwa; dibatasi dari mengedit data lama atau menghapus data.
5. **Audit Log Transaksi**: Seluruh mutasi data dan aktivitas tercatat secara permanen dengan snapshot sebelum dan sesudah perubahan.
6. **Peristiwa Gerejawi**: Pencatatan Baptis, Sidi, Pernikahan, Perpindahan Kelompok, Mutasi Jemaat, dan Arsip Meninggal.
7. **Peringatan & HUT Jemaat**: Monitoring ulang tahun 7 hari ke depan dan bulan berjalan (dengan penanganan tepat untuk 29 Februari pada tahun kabisat).
8. **Backup & Restore Aman**: Backup database SQLite online tanpa menghentikan aplikasi, dengan verifikasi integritas data otomatis.

---

## 🛠️ Teknologi
- **Desktop Framework**: Tauri 2 (Rust)
- **Frontend**: Next.js 14+ (App Router dengan Static Export)
- **Bahasa**: TypeScript (Strict Mode) & Rust
- **Styling**: Tailwind CSS & Shadcn/UI
- **Database**: SQLite 3 (WAL mode, Foreign Keys ON)
- **Kriptografi**: Argon2id untuk hashing kata sandi

---

## 🚀 Panduan Pengembangan & Pengujian

### Prasyarat di Ubuntu / Linux:
- Rust Toolchain (`rustc`, `cargo`)
- Node.js LTS (v20+ atau v22+) & pnpm
- WebKit2GTK & GTK 3 Dev Libraries (`libwebkit2gtk-4.1-dev`, `libgtk-3-dev`)

### Menjalankan Pengujian:
```bash
# Menjalankan pengujian unit Rust (backend):
cargo test --manifest-path src-tauri/Cargo.toml

# Menjalankan pengujian frontend (Vitest):
pnpm test:run

# Memeriksa TypeScript & Lint:
pnpm tsc --noEmit
pnpm lint
```

### Menjalankan Mode Development:
```bash
pnpm tauri dev
```

### Build Aplikasi:
```bash
# Build Frontend Statis:
pnpm build

# Build Binary Desktop:
pnpm tauri build
```
