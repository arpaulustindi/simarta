# SECURITY POLICY & SPECIFICATION: SIMARTA
## Sistem Informasi GMIST Maranatha Tahuna

### 1. Prinsip Keamanan Sistem
Aplikasi SiMarta mengadopsi pendekatan **Zero-Trust Client** dan **Defense-in-Depth** untuk lingkungan desktop offline.

---

### 2. Autentikasi & Hashing Kata Sandi
- **Algoritma**: **Argon2id** (Memory cost: 19456 KiB, Time cost: 2 iterasi, Parallelism: 1 thread, Salt: 16 bytes Cryptographically Secure PRNG).
- **Tidak Ada Kredensial Default**: Database awal tidak menyediakan username/password default seperti `admin/admin`. Aplikasi mewajibkan pembuatan Administrator saat pertama kali diluncurkan (Onboarding Wizard).
- **Session Tokens**: Sesi login menggunakan token acak 256-bit (32 bytes) yang di-hash dengan SHA-256 sebelum disimpan di tabel `sessions`. Sesi kedaluwarsa otomatis setelah 8 jam tidak aktif.

---

### 3. Matriks Otorisasi Berbasis Role (RBAC)
Penegakan izin dilakukan **eksklusif di backend Rust** melalui validasi sesi pada setiap invoke command:

| Operasi / Domain | ADMIN | OPERATOR | Keterangan Backend |
|---|---|---|---|
| Lihat & Cari Data Jemaat | Ya | Ya | Diizinkan |
| Tambah Data Jemaat Baru | Ya | Ya | Diizinkan |
| Koreksi / Edit Data Jemaat Lama | Ya | **Ditolak** | Operator mengembalikan error `FORBIDDEN` |
| Arsip Data Jemaat | Ya | **Ditolak** | Hanya Admin |
| Ubah Pelka Aktual | Ya | **Ditolak** | Harus melalui dialog konfirmasi Admin |
| Kelola Akun Pengguna / Role | Ya | **Ditolak** | Khusus Admin |
| Ekspor Data (CSV / XLSX) | Ya | **Ditolak** | Khusus Admin |
| Impor Data (CSV / XLSX) | Ya | **Ditolak** | Khusus Admin |
| Database Backup & Restore | Ya | **Ditolak** | Khusus Admin |
| Lihat Audit Log | Ya | **Ditolak** | Khusus Admin (Read-only) |
| Hapus / Edit Audit Log | **Ditolak** | **Ditolak** | Immutable (tidak dapat diubah siapa pun) |

---

### 4. Perlindungan Basis Data & Filesystem
- **Prepared Statements**: Seluruh kueri SQLite menggunakan query berparameter (`rusqlite::params![]`). Tidak ada interpolasi string SQL mentah untuk mencegah SQL Injection.
- **Batasan Filesystem Tauri**: Tauri scope membatasi pembacaan/penulisan file hanya pada folder data aplikasi pengguna dan file dialog yang dipilih secara eksplisit oleh pengguna saat backup/ekspor.
- **Penyimpanan Database**:
  - Windows: `%APPDATA%\com.gmist.simarta\simarta.db`
  - Linux: `~/.local/share/com.gmist.simarta/simarta.db`
- **Mitigasi CSV Formula Injection**: Saat ekspor CSV, setiap sel yang dimulai dengan `=`, `+`, `-`, atau `@` otomatis diberi prefix tanda petik tunggal (`'`) agar tidak dieksekusi sebagai formula saat dibuka di Microsoft Excel.

---

### 5. Batasan Keamanan Lokal (Local Machine Threat Model)
Karena aplikasi berjalan di komputer fisik pengguna:
- Pengguna yang memiliki akses root/administrator pada sistem operasi Windows/Linux secara teknis dapat membaca file SQLite mentah di disk.
- Sebagai rekomendasi operasional gereja, komputer administrasi wajib mengaktifkan proteksi akun Windows dan enkripsi drive BitLocker / LUKS.
