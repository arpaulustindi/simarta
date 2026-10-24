# DATABASE SCHEMA: SIMARTA
## Sistem Informasi GMIST Maranatha Tahuna (SQLite 3)

### 1. Standar Desain
- Database Engine: **SQLite 3**
- Integritas Referensial: `PRAGMA foreign_keys = ON;`
- Concurrency Mode: `PRAGMA journal_mode = WAL;`
- Primary Key: UUID v4 (36 karakter string) untuk stabilitas antar perangkat dan backup merge.
- Tanggal & Waktu: Format ISO 8601 UTC (`YYYY-MM-DDTHH:MM:SSZ`) atau format tanggal murni (`YYYY-MM-DD`).

---

### 2. Definisi Tabel

#### 1. `users`
Menyimpan akun pengguna aplikasi (Admin & Operator).
```sql
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('ADMIN', 'OPERATOR')) NOT NULL,
    full_name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1 NOT NULL,
    created_at TEXT NOT NULL,
    created_by TEXT,
    last_login_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
```

#### 2. `sessions`
Menyimpan sesi aktif pengguna lokal.
```sql
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
```

#### 3. `kelompok`
Menyimpan data kelompok ibadah jemaat (Kelompok 1 sampai n).
```sql
CREATE TABLE IF NOT EXISTS kelompok (
    id TEXT PRIMARY KEY,
    nomor_kelompok TEXT UNIQUE NOT NULL,
    nama_kelompok TEXT NOT NULL,
    deskripsi TEXT,
    is_active INTEGER DEFAULT 1 NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

#### 4. `pelka`
Menyimpan kategori Pelayanan Kategorial gerejawi GMIST.
```sql
CREATE TABLE IF NOT EXISTS pelka (
    id TEXT PRIMARY KEY,
    kode TEXT UNIQUE NOT NULL, -- ANAK, REMAJA, PEMUDA, BAPAK, IBU, LANSIA
    nama_pelka TEXT NOT NULL,
    deskripsi TEXT,
    is_active INTEGER DEFAULT 1 NOT NULL
);
```

#### 5. `jemaat`
Menyimpan data induk anggota jemaat.
```sql
CREATE TABLE IF NOT EXISTS jemaat (
    id TEXT PRIMARY KEY,
    nomor_anggota TEXT UNIQUE NOT NULL,
    nik TEXT,
    nama_lengkap TEXT NOT NULL,
    tempat_lahir TEXT,
    tanggal_lahir TEXT NOT NULL, -- YYYY-MM-DD
    jenis_kelamin TEXT CHECK(jenis_kelamin IN ('L', 'P')) NOT NULL,
    status_perkawinan TEXT CHECK(status_perkawinan IN ('BELUM_MENIKAH', 'MENIKAH', 'CERAI_HIDUP', 'CERAI_MATI')) NOT NULL,
    tanggal_menikah TEXT, -- YYYY-MM-DD
    pendidikan_terakhir TEXT,
    bidang_ilmu TEXT,
    pekerjaan TEXT,
    alamat TEXT,
    desa_kelurahan TEXT,
    kecamatan TEXT,
    nomor_telepon TEXT,
    status_keanggotaan TEXT CHECK(status_keanggotaan IN ('AKTIF', 'PINDAH', 'MENINGGAL', 'NONAKTIF')) DEFAULT 'AKTIF' NOT NULL,
    tanggal_masuk TEXT,
    tanggal_meninggal TEXT,
    pelka_id TEXT REFERENCES pelka(id),
    kelompok_id TEXT REFERENCES kelompok(id),
    is_archived INTEGER DEFAULT 0 NOT NULL,
    created_at TEXT NOT NULL,
    created_by TEXT REFERENCES users(id),
    updated_at TEXT NOT NULL,
    updated_by TEXT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_jemaat_nama ON jemaat(nama_lengkap);
CREATE INDEX IF NOT EXISTS idx_jemaat_nik ON jemaat(nik);
CREATE INDEX IF NOT EXISTS idx_jemaat_kelompok ON jemaat(kelompok_id);
CREATE INDEX IF NOT EXISTS idx_jemaat_pelka ON jemaat(pelka_id);
CREATE INDEX IF NOT EXISTS idx_jemaat_status ON jemaat(status_keanggotaan);
CREATE INDEX IF NOT EXISTS idx_jemaat_tgl_lahir ON jemaat(tanggal_lahir);
```

#### 6. `keluarga`
Menyimpan data kartu keluarga jemaat.
```sql
CREATE TABLE IF NOT EXISTS keluarga (
    id TEXT PRIMARY KEY,
    nomor_keluarga TEXT UNIQUE NOT NULL,
    nama_keluarga TEXT NOT NULL,
    kepala_keluarga_id TEXT REFERENCES jemaat(id),
    tanggal_pembentukan TEXT,
    status TEXT DEFAULT 'AKTIF' NOT NULL,
    alamat TEXT,
    catatan TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_keluarga_nomor ON keluarga(nomor_keluarga);
```

#### 7. `anggota_keluarga`
Relasi relasional jemaat dalam susunan keluarga.
```sql
CREATE TABLE IF NOT EXISTS anggota_keluarga (
    id TEXT PRIMARY KEY,
    keluarga_id TEXT NOT NULL REFERENCES keluarga(id) ON DELETE CASCADE,
    jemaat_id TEXT NOT NULL REFERENCES jemaat(id) ON DELETE RESTRICT,
    hubungan_keluarga TEXT CHECK(hubungan_keluarga IN ('KEPALA_KELUARGA', 'SUAMI', 'ISTRI', 'ANAK', 'ORANG_TUA', 'MERTUA', 'FAMILI_LAIN')) NOT NULL,
    tanggal_mulai TEXT NOT NULL,
    tanggal_berakhir TEXT,
    catatan TEXT,
    UNIQUE(keluarga_id, jemaat_id)
);
CREATE INDEX IF NOT EXISTS idx_anggota_keluarga_jemaat ON anggota_keluarga(jemaat_id);
```

#### 8. `riwayat_kelompok`
Mencatat mutasi perpindahan kelompok ibadah.
```sql
CREATE TABLE IF NOT EXISTS riwayat_kelompok (
    id TEXT PRIMARY KEY,
    jemaat_id TEXT NOT NULL REFERENCES jemaat(id),
    kelompok_asal_id TEXT REFERENCES kelompok(id),
    kelompok_tujuan_id TEXT NOT NULL REFERENCES kelompok(id),
    tanggal_perpindahan TEXT NOT NULL,
    alasan TEXT,
    recorded_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL
);
```

#### 9. `jabatan`
Master jabatan pelayanan GMIST (Diaken, Penatua, Pengurus Pelka, dll).
```sql
CREATE TABLE IF NOT EXISTS jabatan (
    id TEXT PRIMARY KEY,
    nama_jabatan TEXT NOT NULL,
    jenis TEXT CHECK(jenis IN ('FUNGSIONAL', 'STRUKTURAL')) NOT NULL,
    deskripsi TEXT,
    is_active INTEGER DEFAULT 1 NOT NULL
);
```

#### 10. `riwayat_jabatan`
Mencatat periode peneguhan dan masa bakti jabatan jemaat.
```sql
CREATE TABLE IF NOT EXISTS riwayat_jabatan (
    id TEXT PRIMARY KEY,
    jemaat_id TEXT NOT NULL REFERENCES jemaat(id),
    jabatan_id TEXT NOT NULL REFERENCES jabatan(id),
    lingkup TEXT CHECK(lingkup IN ('JEMAAT', 'KELOMPOK', 'PELKA')) NOT NULL,
    kelompok_id TEXT REFERENCES kelompok(id),
    pelka_id TEXT REFERENCES pelka(id),
    tanggal_pengangkatan TEXT NOT NULL,
    tanggal_berakhir TEXT,
    keterangan TEXT,
    recorded_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL
);
```

#### 11. `riwayat_gerejawi`
Mencatat peristiwa sakramen dan peneguhan iman.
```sql
CREATE TABLE IF NOT EXISTS riwayat_gerejawi (
    id TEXT PRIMARY KEY,
    jemaat_id TEXT NOT NULL REFERENCES jemaat(id),
    jenis_peristiwa TEXT CHECK(jenis_peristiwa IN ('BAPTIS', 'SIDI', 'PERKAWINAN', 'PENGAKUAN_DOSA', 'LAINNYA')) NOT NULL,
    tanggal_peristiwa TEXT NOT NULL,
    tempat TEXT,
    pelayan_firman TEXT,
    nomor_surat TEXT,
    keterangan TEXT,
    recorded_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_riwayat_gerejawi_jemaat ON riwayat_gerejawi(jemaat_id);
```

#### 12. `riwayat_keanggotaan`
Mencatat perubahan status jemaat (Aktif, Pindah, Meninggal).
```sql
CREATE TABLE IF NOT EXISTS riwayat_keanggotaan (
    id TEXT PRIMARY KEY,
    jemaat_id TEXT NOT NULL REFERENCES jemaat(id),
    status_sebelumnya TEXT NOT NULL,
    status_baru TEXT NOT NULL,
    tanggal_perubahan TEXT NOT NULL,
    alasan TEXT,
    jemaat_tujuan_asal TEXT,
    nomor_surat TEXT,
    recorded_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL
);
```

#### 13. `arsip_meninggal`
Data arsip jemaat yang berpulang.
```sql
CREATE TABLE IF NOT EXISTS arsip_meninggal (
    id TEXT PRIMARY KEY,
    jemaat_id TEXT NOT NULL REFERENCES jemaat(id),
    tanggal_meninggal TEXT NOT NULL,
    tempat_meninggal TEXT,
    tempat_pemakaman TEXT,
    pelayan_pemakaman TEXT,
    nomor_surat_kematian TEXT,
    keterangan TEXT,
    archived_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL
);
```

#### 14. `audit_logs`
Pencatatan riwayat aktivitas transaksi dan perubahan data sistem.
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    username TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT CHECK(action IN ('CREATE', 'UPDATE', 'ARCHIVE', 'DELETE', 'RESTORE', 'LOGIN', 'LOGOUT', 'IMPORT', 'EXPORT', 'BACKUP')) NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    old_data TEXT, -- JSON snapshot sebelum perubahan
    new_data TEXT, -- JSON snapshot setelah perubahan
    summary TEXT NOT NULL,
    reason TEXT,
    ip_or_device TEXT,
    timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity, entity_id);
```

#### 15. `import_logs`
Catatan riwayat impor data dari file lokal.
```sql
CREATE TABLE IF NOT EXISTS import_logs (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    total_rows INTEGER NOT NULL,
    success_count INTEGER NOT NULL,
    failed_count INTEGER NOT NULL,
    error_summary TEXT, -- JSON detail baris gagal
    imported_by TEXT REFERENCES users(id),
    created_at TEXT NOT NULL
);
```

#### 16. `app_settings`
Konfigurasi aplikasi lokal.
```sql
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT REFERENCES users(id)
);
```
