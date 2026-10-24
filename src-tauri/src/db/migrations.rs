use rusqlite::{Connection, Result};
use uuid::Uuid;
use chrono::Utc;

pub fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;

        -- 1. users
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

        -- 2. sessions
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

        -- 3. kelompok
        CREATE TABLE IF NOT EXISTS kelompok (
            id TEXT PRIMARY KEY,
            nomor_kelompok TEXT UNIQUE NOT NULL,
            nama_kelompok TEXT NOT NULL,
            deskripsi TEXT,
            is_active INTEGER DEFAULT 1 NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        -- 4. pelka
        CREATE TABLE IF NOT EXISTS pelka (
            id TEXT PRIMARY KEY,
            kode TEXT UNIQUE NOT NULL,
            nama_pelka TEXT NOT NULL,
            deskripsi TEXT,
            is_active INTEGER DEFAULT 1 NOT NULL
        );

        -- 5. jemaat
        CREATE TABLE IF NOT EXISTS jemaat (
            id TEXT PRIMARY KEY,
            nomor_anggota TEXT UNIQUE NOT NULL,
            nik TEXT,
            nama_lengkap TEXT NOT NULL,
            tempat_lahir TEXT,
            tanggal_lahir TEXT NOT NULL,
            jenis_kelamin TEXT CHECK(jenis_kelamin IN ('L', 'P')) NOT NULL,
            status_perkawinan TEXT CHECK(status_perkawinan IN ('BELUM_MENIKAH', 'MENIKAH', 'CERAI_HIDUP', 'CERAI_MATI')) NOT NULL,
            tanggal_menikah TEXT,
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

        -- 6. keluarga
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

        -- 7. anggota_keluarga
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

        -- 8. riwayat_kelompok
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

        -- 9. jabatan
        CREATE TABLE IF NOT EXISTS jabatan (
            id TEXT PRIMARY KEY,
            nama_jabatan TEXT NOT NULL,
            jenis TEXT CHECK(jenis IN ('FUNGSIONAL', 'STRUKTURAL')) NOT NULL,
            deskripsi TEXT,
            is_active INTEGER DEFAULT 1 NOT NULL
        );

        -- 10. riwayat_jabatan
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

        -- 11. riwayat_gerejawi
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

        -- 12. riwayat_keanggotaan
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

        -- 13. arsip_meninggal
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

        -- 14. audit_logs
        CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            username TEXT NOT NULL,
            role TEXT NOT NULL,
            action TEXT CHECK(action IN ('CREATE', 'UPDATE', 'ARCHIVE', 'DELETE', 'RESTORE', 'LOGIN', 'LOGOUT', 'IMPORT', 'EXPORT', 'BACKUP')) NOT NULL,
            entity TEXT NOT NULL,
            entity_id TEXT,
            old_data TEXT,
            new_data TEXT,
            summary TEXT NOT NULL,
            reason TEXT,
            ip_or_device TEXT,
            timestamp TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity, entity_id);

        -- 15. import_logs
        CREATE TABLE IF NOT EXISTS import_logs (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            total_rows INTEGER NOT NULL,
            success_count INTEGER NOT NULL,
            failed_count INTEGER NOT NULL,
            error_summary TEXT,
            imported_by TEXT REFERENCES users(id),
            created_at TEXT NOT NULL
        );

        -- 16. app_settings
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            updated_by TEXT REFERENCES users(id)
        );
        ",
    )?;

    seed_defaults(conn)?;

    Ok(())
}

fn seed_defaults(conn: &Connection) -> Result<()> {
    // Seed default Pelka if empty
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM pelka", [], |r| r.get(0))?;
    if count == 0 {
        let pelka_items = [
            ("ANAK", "Pelayanan Kategorial Anak", "Anak usia 0 - 12 tahun"),
            ("REMAJA", "Pelayanan Kategorial Remaja", "Remaja usia 13 - 16 tahun"),
            ("PEMUDA", "Pelayanan Kategorial Pemuda", "Pemuda usia 17 - 35 tahun dan belum menikah"),
            ("BAPAK", "Pelayanan Kategorial Pria Kaum Bapa (PKB)", "Bapak atau pria menikah/dewasa"),
            ("IBU", "Pelayanan Kategorial Wanita Kaum Ibu (WKI)", "Ibu atau wanita menikah/dewasa"),
            ("LANSIA", "Pelayanan Kategorial Lanjut Usia", "Warga jemaat usia 60 tahun ke atas"),
        ];

        for (kode, nama, deskripsi) in pelka_items {
            let id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO pelka (id, kode, nama_pelka, deskripsi, is_active) VALUES (?1, ?2, ?3, ?4, 1)",
                rusqlite::params![id, kode, nama, deskripsi],
            )?;
        }
    }

    // Seed default Kelompok if empty
    let kelompok_count: i64 = conn.query_row("SELECT COUNT(*) FROM kelompok", [], |r| r.get(0))?;
    if kelompok_count == 0 {
        let now = Utc::now().to_rfc3339();
        for i in 1..=12 {
            let id = Uuid::new_v4().to_string();
            let nomor = format!("{:02}", i);
            let nama = format!("Kelompok {}", i);
            let deskripsi = format!("Kelompok Ibadah Rumah Tangga Wilayah {}", i);
            conn.execute(
                "INSERT INTO kelompok (id, nomor_kelompok, nama_kelompok, deskripsi, is_active, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, 1, ?5, ?5)",
                rusqlite::params![id, nomor, nama, deskripsi, now],
            )?;
        }
    }

    // Seed default Jabatan if empty
    let jabatan_count: i64 = conn.query_row("SELECT COUNT(*) FROM jabatan", [], |r| r.get(0))?;
    if jabatan_count == 0 {
        let jabatan_items = [
            ("Penatua", "FUNGSIONAL", "Pelayan Khusus fungsional Penatua GMIST"),
            ("Diaken", "FUNGSIONAL", "Pelayan Khusus fungsional Diaken GMIST"),
            ("Ketua Pelka", "STRUKTURAL", "Pengurus Badan Pengurus Pelka"),
            ("Wakil Ketua Pelka", "STRUKTURAL", "Pengurus Badan Pengurus Pelka"),
            ("Sekretaris Pelka", "STRUKTURAL", "Pengurus Badan Pengurus Pelka"),
            ("Bendahara Pelka", "STRUKTURAL", "Pengurus Badan Pengurus Pelka"),
            ("Koordinator Kelompok", "STRUKTURAL", "Pengurus Pelayanan Wilayah Kelompok"),
            ("Ketua Kelompok", "STRUKTURAL", "Ketua Rukun/Kelompok Ibadah"),
        ];

        for (nama, jenis, deskripsi) in jabatan_items {
            let id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO jabatan (id, nama_jabatan, jenis, deskripsi, is_active) VALUES (?1, ?2, ?3, ?4, 1)",
                rusqlite::params![id, nama, jenis, deskripsi],
            )?;
        }
    }

    Ok(())
}

pub fn seed_dummy_data(conn: &Connection) -> Result<()> {
    // 1. Get Pelka ID map
    let mut stmt = conn.prepare("SELECT id, kode FROM pelka")?;
    let pelka_rows = stmt.query_map([], |r| Ok((r.get::<_, String>(1)?, r.get::<_, String>(0)?)))?;
    let mut pelka_map = std::collections::HashMap::new();
    for row in pelka_rows {
        if let Ok((kode, id)) = row {
            pelka_map.insert(kode, id);
        }
    }

    // 2. Get Kelompok ID map
    let mut stmt = conn.prepare("SELECT id, nomor_kelompok FROM kelompok")?;
    let kelompok_rows = stmt.query_map([], |r| Ok((r.get::<_, String>(1)?, r.get::<_, String>(0)?)))?;
    let mut kelompok_map = std::collections::HashMap::new();
    for row in kelompok_rows {
        if let Ok((nomor, id)) = row {
            kelompok_map.insert(nomor, id);
        }
    }

    // 3. Get Jabatan ID map
    let mut stmt = conn.prepare("SELECT id, nama_jabatan FROM jabatan")?;
    let jabatan_rows = stmt.query_map([], |r| Ok((r.get::<_, String>(1)?, r.get::<_, String>(0)?)))?;
    let mut jabatan_map = std::collections::HashMap::new();
    for row in jabatan_rows {
        if let Ok((nama, id)) = row {
            jabatan_map.insert(nama, id);
        }
    }

    let now = Utc::now().to_rfc3339();

    // 10 Jemaat Dummy GMIST
    let jemaat_data: [(&str, &str, &str, &str, &str, &str, &str, Option<&str>, &str, &str, &str, &str, &str, &str); 10] = [
        ("jemaat-dummy-1", "JM-2026-0001", "Jonathan Tatengkeng", "Tahuna", "1994-05-15", "L", "BELUM_MENIKAH", None, "S1", "Wiraswasta", "Jl. Tidore No. 12, Sawang Bendar", "081234567890", "03", "PEMUDA"),
        ("jemaat-dummy-2", "JM-2026-0002", "Debora Sasundu", "Manado", "1964-10-26", "P", "MENIKAH", Some("1988-06-18"), "S1", "Guru/Pendidik", "Kompleks Maranatha, Tahuna", "082198765432", "01", "LANSIA"),
        ("jemaat-dummy-3", "JM-2026-0003", "Marten Gaghana", "Tahuna", "1988-10-28", "L", "MENIKAH", Some("2015-09-12"), "S2", "PNS/ASN", "Jl. Baru Kolongan, Tahuna", "085311223344", "05", "BAPAK"),
        ("jemaat-dummy-4", "JM-2026-0004", "Sintia Makasenda", "Tahuna", "1990-03-14", "P", "MENIKAH", Some("2015-09-12"), "S1", "Pegawai Swasta", "Jl. Baru Kolongan, Tahuna", "085355667788", "05", "IBU"),
        ("jemaat-dummy-5", "JM-2026-0005", "Daniel Gaghana", "Tahuna", "2016-08-20", "L", "BELUM_MENIKAH", None, "SD", "Pelajar/Mahasiswa", "Jl. Baru Kolongan, Tahuna", "", "05", "ANAK"),
        ("jemaat-dummy-6", "JM-2026-0006", "Priskila Gaghana", "Tahuna", "2010-06-12", "P", "BELUM_MENIKAH", None, "SMP", "Pelajar/Mahasiswa", "Jl. Baru Kolongan, Tahuna", "", "05", "REMAJA"),
        ("jemaat-dummy-7", "JM-2026-0007", "Yulius Tatengkeng", "Tahuna", "1960-12-05", "L", "MENIKAH", Some("1992-07-20"), "SMA/SMK", "Pensiunan", "Jl. Tidore No. 12, Sawang Bendar", "081399887766", "03", "LANSIA"),
        ("jemaat-dummy-8", "JM-2026-0008", "Maria Sasamu", "Manganitu", "1962-04-18", "P", "MENIKAH", Some("1992-07-20"), "SMA/SMK", "Ibu Rumah Tangga", "Jl. Tidore No. 12, Sawang Bendar", "081388776655", "03", "LANSIA"),
        ("jemaat-dummy-9", "JM-2026-0009", "Efraim Pontoh", "Tahuna", "1999-11-02", "L", "BELUM_MENIKAH", None, "D3", "Wiraswasta", "Kel. Apengsembeka, Tahuna", "082211447788", "02", "PEMUDA"),
        ("jemaat-dummy-10", "JM-2026-0010", "Grace Manoppo", "Tahuna", "2002-09-17", "P", "BELUM_MENIKAH", None, "S1", "Pelajar/Mahasiswa", "Kel. Bungalawang, Tahuna", "082344556677", "02", "PEMUDA"),
    ];

    for (id, no_anggota, nama, tempat, tgl_lahir, jk, status_nikah, tgl_nikah, pend, kerja, alamat, telp, kel_no, pelka_kode) in jemaat_data {
        let p_id = pelka_map.get(pelka_kode);
        let k_id = kelompok_map.get(kel_no);
        conn.execute(
            "INSERT INTO jemaat (
                id, nomor_anggota, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin,
                status_perkawinan, tanggal_menikah, pendidikan_terakhir, pekerjaan,
                alamat, nomor_telepon, status_keanggotaan, pelka_id, kelompok_id,
                is_archived, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 'AKTIF', ?13, ?14, 0, ?15, ?15)",
            rusqlite::params![id, no_anggota, nama, tempat, tgl_lahir, jk, status_nikah, tgl_nikah, pend, kerja, alamat, telp, p_id, k_id, now],
        )?;
    }

    // 3 Keluarga Dummy
    let keluarga_data = [
        ("keluarga-dummy-1", "KK-2026-0001", "Gaghana - Makasenda", "jemaat-dummy-3", "2015-09-12", "Jl. Baru Kolongan, Tahuna", "Keluarga diberkati di GMIST Maranatha Tahuna"),
        ("keluarga-dummy-2", "KK-2026-0002", "Tatengkeng - Sasamu", "jemaat-dummy-7", "1992-07-20", "Jl. Tidore No. 12, Sawang Bendar", "Keluarga pilar pelayanan jemaat"),
        ("keluarga-dummy-3", "KK-2026-0003", "Sasundu", "jemaat-dummy-2", "1988-06-18", "Kompleks Maranatha, Tahuna", "Keluarga Diaken jemaat"),
    ];

    for (k_id, no_kk, nama_kk, kepala_id, tgl_bentuk, alamat, catatan) in keluarga_data {
        conn.execute(
            "INSERT INTO keluarga (
                id, nomor_keluarga, nama_keluarga, kepala_keluarga_id,
                tanggal_pembentukan, status, alamat, catatan, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, 'AKTIF', ?6, ?7, ?8, ?8)",
            rusqlite::params![k_id, no_kk, nama_kk, kepala_id, tgl_bentuk, alamat, catatan, now],
        )?;
    }

    // Anggota Keluarga Dummy
    let anggota_data = [
        // Keluarga 1
        ("ak-dummy-1", "keluarga-dummy-1", "jemaat-dummy-3", "KEPALA_KELUARGA", "2015-09-12"),
        ("ak-dummy-2", "keluarga-dummy-1", "jemaat-dummy-4", "ISTRI", "2015-09-12"),
        ("ak-dummy-3", "keluarga-dummy-1", "jemaat-dummy-5", "ANAK", "2016-08-20"),
        ("ak-dummy-4", "keluarga-dummy-1", "jemaat-dummy-6", "ANAK", "2015-09-12"),
        // Keluarga 2
        ("ak-dummy-5", "keluarga-dummy-2", "jemaat-dummy-7", "KEPALA_KELUARGA", "1992-07-20"),
        ("ak-dummy-6", "keluarga-dummy-2", "jemaat-dummy-8", "ISTRI", "1992-07-20"),
        ("ak-dummy-7", "keluarga-dummy-2", "jemaat-dummy-1", "ANAK", "1994-05-15"),
        // Keluarga 3
        ("ak-dummy-8", "keluarga-dummy-3", "jemaat-dummy-2", "KEPALA_KELUARGA", "1988-06-18"),
    ];

    for (ak_id, k_id, j_id, hub, tgl_mulai) in anggota_data {
        conn.execute(
            "INSERT INTO anggota_keluarga (id, keluarga_id, jemaat_id, hubungan_keluarga, tanggal_mulai)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![ak_id, k_id, j_id, hub, tgl_mulai],
        )?;
    }

    // Peristiwa Gerejawi Dummy
    let peristiwa_data = [
        ("pg-dummy-1", "jemaat-dummy-1", "BAPTIS", "1994-08-10", "GMIST Maranatha Tahuna", "Pdt. M. Sasundu, M.Th", "BAP/1994/082", "Baptis Kudus Anak"),
        ("pg-dummy-2", "jemaat-dummy-1", "SIDI", "2012-04-08", "GMIST Maranatha Tahuna", "Pdt. J. Gaghana, S.Th", "SIDI/2012/015", "Peneguhan Sidi"),
        ("pg-dummy-3", "jemaat-dummy-3", "PERKAWINAN", "2015-09-12", "GMIST Maranatha Tahuna", "Pdt. M. Sasundu, M.Th", "NIKAH/2015/044", "Pemberkatan Nikah Kudus Marten & Sintia"),
        ("pg-dummy-4", "jemaat-dummy-5", "BAPTIS", "2016-11-20", "GMIST Maranatha Tahuna", "Pdt. J. Gaghana, S.Th", "BAP/2016/102", "Baptis Kudus Anak"),
        ("pg-dummy-5", "jemaat-dummy-6", "BAPTIS", "2010-09-15", "GMIST Maranatha Tahuna", "Pdt. M. Sasundu, M.Th", "BAP/2010/067", "Baptis Kudus Anak"),
        ("pg-dummy-6", "jemaat-dummy-2", "SIDI", "1982-04-11", "GMIST Maranatha Tahuna", "Pdt. T. Sasamu, S.Th", "SIDI/1982/019", "Peneguhan Sidi"),
    ];

    for (pg_id, j_id, jenis, tgl, tempat, pelayan, no_surat, ket) in peristiwa_data {
        conn.execute(
            "INSERT INTO riwayat_gerejawi (id, jemaat_id, jenis_peristiwa, tanggal_peristiwa, tempat, pelayan_firman, nomor_surat, keterangan, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            rusqlite::params![pg_id, j_id, jenis, tgl, tempat, pelayan, no_surat, ket, now],
        )?;
    }

    // Pejabat Pelayanan Dummy
    if let (Some(penatua_id), Some(diaken_id), Some(ketua_pelka_id)) = (
        jabatan_map.get("Penatua"),
        jabatan_map.get("Diaken"),
        jabatan_map.get("Ketua Pelka"),
    ) {
        let p_pemuda = pelka_map.get("PEMUDA");
        let k_01 = kelompok_map.get("01");

        let pejabat_data = [
            ("rj-dummy-1", "jemaat-dummy-3", penatua_id, "JEMAAT", None, None, "2024-01-01", "Pelayan Khusus Penatua GMIST Maranatha Tahuna (SK/PELSUS/2024/001)"),
            ("rj-dummy-2", "jemaat-dummy-2", diaken_id, "KELOMPOK", None, k_01, "2024-01-01", "Pelayan Khusus Diaken Wilayah Kelompok 01 (SK/PELSUS/2024/002)"),
            ("rj-dummy-3", "jemaat-dummy-1", ketua_pelka_id, "PELKA", p_pemuda, None, "2025-02-15", "Ketua Badan Pengurus Pelka Pemuda (SK/PELKA-PMD/2025/001)"),
        ];

        for (rj_id, j_id, jab_id, lingkup, p_id, k_id, tgl_angkat, ket) in pejabat_data {
            conn.execute(
                "INSERT INTO riwayat_jabatan (id, jemaat_id, jabatan_id, lingkup, pelka_id, kelompok_id, tanggal_pengangkatan, keterangan, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                rusqlite::params![rj_id, j_id, jab_id, lingkup, p_id, k_id, tgl_angkat, ket, now],
            )?;
        }
    }

    // Record dummy status in app_settings
    conn.execute(
        "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('dummy_data_status', 'active', ?1)",
        [&now],
    )?;

    Ok(())
}

