# ARCHITECTURE DESIGN: SIMARTA
## Sistem Informasi GMIST Maranatha Tahuna (Desktop Offline)

### 1. Diagram Arsitektur Komponen

```
+-------------------------------------------------------------------+
|               SiMarta Desktop Window (Tauri 2)                    |
|                                                                   |
|  +-------------------------------------------------------------+  |
|  |             Frontend Layer (Next.js Static Export)          |  |
|  |                                                             |  |
|  |  [Shadcn/UI + Tailwind]     [Pure Pelka Suggestion Engine]  |  |
|  |  [React Hook Form + Zod]    [React Context Auth & Session]  |  |
|  +-------------------------------------------------------------+  |
|                                |                                  |
|                         Tauri IPC Bridge                          |
|                                |                                  |
|  +-------------------------------------------------------------+  |
|  |                 Backend Layer (Rust Native)                 |  |
|  |                                                             |  |
|  |  +-------------------+  +-------------------+  +---------+  |  |
|  |  | Tauri IPC Commands|  | RBAC Guard Engine |  | Argon2id|  |  |
|  |  +-------------------+  +-------------------+  +---------+  |  |
|  |  +-------------------+  +-------------------+  +---------+  |  |
|  |  | Audit Log Engine  |  | Backup & Restore  |  | Migrator|  |  |
|  |  +-------------------+  +-------------------+  +---------+  |  |
|  +-------------------------------------------------------------+  |
|                                |                                  |
|                      SQLite Embedded Engine                       |
|                                |                                  |
|  +-------------------------------------------------------------+  |
|  |               Persistent Local Data Storage                 |  |
|  |                                                             |  |
|  |  - Windows: %APPDATA%/com.gmist.simarta/simarta.db          |  |
|  |  - Linux:   ~/.local/share/com.gmist.simarta/simarta.db     |  |
|  +-------------------------------------------------------------+  |
+-------------------------------------------------------------------+
```

---

### 2. Keputusan Arsitektur Utama (ADR)

#### ADR 01: Tauri 2 + Next.js App Router (Static Export)
- **Konteks**: Aplikasi desktop membutuhkan performa tinggi, jejak memori hemat, dan kompatibilitas Windows 10/11 x86_64 tanpa runtime Node.js di komputer pengguna.
- **Keputusan**: Menggunakan Tauri 2 dengan Rust untuk native runtime dan Next.js dengan `output: 'export'`.
- **Konsekuensi**: Seluruh aset frontend dikompilasi menjadi HTML/JS/CSS statis pada folder `out/`. Tidak ada Next.js server runtime terpisah. Seluruh operasi IO dan database berjalan via IPC command ke backend Rust.

#### ADR 02: SQLite dengan WAL Mode dan Foreign Key
- **Konteks**: Aplikasi harus zero-config, tidak memerlukan instalasi server database (MySQL/Postgres) terpisah, dan aman dari korupsi data saat shutdown mendadak.
- **Keputusan**: Menggunakan SQLite embedded melalui `rusqlite` dengan `PRAGMA journal_mode = WAL;`, `PRAGMA foreign_keys = ON;`, dan `PRAGMA synchronous = NORMAL;`.
- **Konsekuensi**: Transaksi ACID penuh dengan performa baca-tulis tinggi.

#### ADR 03: Prinsip Otorisasi Backend (Zero Trust Frontend)
- **Konteks**: Pengguna frontend memiliki akses ke devtools atau inspeksi UI. Role yang dikirim dari antarmuka tidak boleh dipercaya secara langsung.
- **Keputusan**: Setiap Tauri command menerima session token, memvalidasi masa berlaku dan role pengguna dari tabel `sessions` & `users` di backend Rust sebelum menjalankan kueri.
- **Aturan**: Operator ditolak di level Rust untuk setiap aksi mutasi data lama, arsip, backup/restore, impor/ekspor, dan manajemen akun.

#### ADR 04: Isolasi Mesin Rekomendasi Pelka (Pure Function)
- **Konteks**: Pelka jemaat tidak boleh berganti secara otomatis saat ulang tahun atau pergantian tahun.
- **Keputusan**: Fungsi `calculatePelkaRecommendation` diisolasi sebagai pure function tanpa efek samping (side effects) ke database.
- **Konsekuensi**: Rekomendasi dihitung dinamis saat ditampilkan, sementara `pelka_id` pada tabel `jemaat` hanya berubah jika Admin melakukan konfirmasi perubahan secara eksplisit.

#### ADR 05: Offline Total dan Tanpa Aset Eksternal
- **Konteks**: Aplikasi digunakan di lingkungan dengan keterbatasan jaringan internet di Tahuna.
- **Keputusan**: Font Inter dan Lucide icons di-bundle secara lokal. CSP memblokir seluruh pemanggilan jaringan eksternal (`connect-src 'self'`).
