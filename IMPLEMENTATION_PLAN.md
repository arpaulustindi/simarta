# IMPLEMENTATION PLAN: SIMARTA (SISTEM INFORMASI GMIST MARANATHA TAHUNA)
## Aplikasi Desktop Offline Standalone

### 1. Ringkasan Eksekutif
Aplikasi **SiMarta** adalah sistem informasi gereja berbasis desktop lokal untuk GMIST Maranatha Tahuna. Sistem dirancang khusus untuk berjalan **100% offline**, menggunakan database lokal SQLite, dengan sistem otorisasi ketat di backend, audit log transaksi, serta antarmuka modern yang adaptif.

---

### 2. Prinsip Fondasi
1. **FULL OFFLINE**: Tidak memerlukan koneksi internet untuk seluruh fitur inti.
2. **LOCAL FIRST**: Database SQLite lokal disimpan pada direktori aplikasi pengguna yang persisten (`app_data_dir`).
3. **NO CLOUD & NO EXTERNAL API**: Tidak ada transmisi data ke internet, tidak ada CDN runtime, tidak ada remote fonts/analytics.
4. **PELKA IS A SUGGESTION**: Sistem **hanya** memberikan saran rekomendasi Pelka; **TIDAK PERNAH** mengubah Pelka aktual secara otomatis.
5. **MANUAL DATA CONTROL**: Setiap perubahan data dan Pelka aktual dilakukan secara sadar oleh Admin berwenang.
6. **AUDITABLE**: Seluruh operasi perubahan data, autentikasi, dan administrasi dicatat dalam `audit_logs`.
7. **SECURE BY DESIGN**: Otorisasi ditegakkan di backend Rust Tauri, bukan sekadar di frontend.
8. **DATA PRESERVATION**: Data dan riwayat tidak hilang saat perubahan status atau perpindahan kelompok/jemaat.

---

### 3. Matriks Fase Pengembangan

| Fase | Fokus | Fitur Utama | Kriteria Selesai |
|---|---|---|---|
| **Tahap 1: Fondasi** | Arsitektur & Keamanan | Tauri 2 + Next.js Static Export, SQLite, Migrasi, Argon2id, RBAC Guard, Audit Log, Setup Wizard, Dashboard Awal. | Rust unit test lulus, Vitest lulus, build statis berhasil, backend menolak akses Operator tanpa hak. |
| **Tahap 2: Data Utama** | Manajemen Master | Data Jemaat, Keluarga, Kelompok, Validasi NIK & Duplikasi, Pencarian Cepat, Filter Multikriteria, Pagination. | CRUD Jemaat & Keluarga lengkap dengan riwayat relasi terjaga. |
| **Tahap 3: Pelayanan Gerejawi** | Logika Gerejawi | Pure Logic Rekomendasi Pelka, Peninjauan & Konfirmasi Admin, Jabatan Fungsional/Struktural, Perhitungan HUT (termasuk 29 Feb). | Uji batas usia Pelka 100% lulus; tidak ada auto-update Pelka aktual. |
| **Tahap 4: Peristiwa** | Riwayat & Administrasi | Baptis, Sidi, Pernikahan, Perpindahan Kelompok, Pindah Jemaat, Kematian & Arsip Meninggal, Koreksi Data. | Seluruh peristiwa menghasilkan entri audit log dan riwayat permanen. |
| **Tahap 5: Administrasi** | Impor/Ekspor & Cadangan | Impor CSV/XLSX dengan validasi & rollback, Ekspor dengan mitigasi formula injection, SQLite Online Backup & Safe Restore. | Restore aman dengan pre-restore backup dan integritas check. |
| **Tahap 6: Rilis & Pengujian** | Stabilisasi & Distribusi | Pengujian end-to-end offline, audit keamanan, panduan distribusi Windows x86_64, dokumentasi operasional. | Aplikasi teruji tanpa koneksi jaringan sama sekali. |

---

### 4. Roadmap Detail Tahap 1 (Fondasi)
1. **Toolchain & Project Setup**: Node.js v22, pnpm, Rust toolchain, Tauri 2 CLI.
2. **Backend Engine**:
   - `db`: Inisialisasi SQLite dengan WAL mode, foreign key aktif, dan skema 16 tabel.
   - `auth`: Password hashing Argon2id, token session, login/logout, check setup.
   - `rbac`: Middleware guard penolak operasi Operator pada fungsi yang dilindungi.
   - `audit`: Modul pencatat aktivitas ke tabel `audit_logs`.
3. **Frontend Application**:
   - Konfigurasi Next.js static export (`output: 'export'`).
   - Tailwind CSS + UI components (Lucide icons lokal, sistem font lokal).
   - Layar Onboarding / First Admin Setup.
   - Layar Login & Session Guard.
   - Layout utama (sidebar responsif, header, offline status, breadcrumb).
   - Layar Dashboard utama dengan ringkasan statistik.
4. **Verifikasi Pengujian**:
   - Unit tests backend (auth, db, rbac, audit).
   - Unit tests frontend (pure calculation pelka & HUT leap year).
   - Verifikasi build lokal.
