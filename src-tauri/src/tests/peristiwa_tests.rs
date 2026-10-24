use crate::db::init_memory_db;
use chrono::Utc;
use uuid::Uuid;

#[test]
fn test_pencatatan_baptis_dan_sidi() {
    let conn = init_memory_db().expect("Failed to init db");
    let now = Utc::now().to_rfc3339();

    let jemaat_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO jemaat (id, nomor_anggota, nama_lengkap, tanggal_lahir, jenis_kelamin, status_perkawinan, created_at, updated_at)
         VALUES (?1, 'JM-2026-0601', 'Adolf Tatengkeng', '2010-05-15', 'L', 'BELUM_MENIKAH', ?2, ?2)",
        rusqlite::params![jemaat_id, now],
    ).unwrap();

    // 1. Catat Baptis
    let b_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO riwayat_gerejawi (
            id, jemaat_id, jenis_peristiwa, tanggal_peristiwa, tempat, pelayan_firman, nomor_surat, created_at
        ) VALUES (?1, ?2, 'BAPTIS', '2010-08-20', 'GMIST Maranatha Tahuna', 'Pdt. M. Sasundu, M.Th', 'BAP/2010/082', ?3)",
        rusqlite::params![b_id, jemaat_id, now],
    ).unwrap();

    // 2. Catat Sidi
    let s_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO riwayat_gerejawi (
            id, jemaat_id, jenis_peristiwa, tanggal_peristiwa, tempat, pelayan_firman, nomor_surat, created_at
        ) VALUES (?1, ?2, 'SIDI', '2026-04-05', 'GMIST Maranatha Tahuna', 'Pdt. J. Gaghana, S.Th', 'SIDI/2026/015', ?3)",
        rusqlite::params![s_id, jemaat_id, now],
    ).unwrap();

    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM riwayat_gerejawi WHERE jemaat_id = ?1",
        [&jemaat_id],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(count, 2);

    let nomor_sidi: String = conn.query_row(
        "SELECT nomor_surat FROM riwayat_gerejawi WHERE id = ?1",
        [&s_id],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(nomor_sidi, "SIDI/2026/015");
}

#[test]
fn test_perkawinan_gerejawi_and_status_update() {
    let conn = init_memory_db().expect("Failed to init db");
    let now = Utc::now().to_rfc3339();

    let m1_id = Uuid::new_v4().to_string();
    let m2_id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO jemaat (id, nomor_anggota, nama_lengkap, tanggal_lahir, jenis_kelamin, status_perkawinan, created_at, updated_at)
         VALUES (?1, 'JM-2026-0602', 'Budi Gaghana', '1995-02-14', 'L', 'BELUM_MENIKAH', ?2, ?2)",
        rusqlite::params![m1_id, now],
    ).unwrap();

    conn.execute(
        "INSERT INTO jemaat (id, nomor_anggota, nama_lengkap, tanggal_lahir, jenis_kelamin, status_perkawinan, created_at, updated_at)
         VALUES (?1, 'JM-2026-0603', 'Siti Sasundu', '1997-09-20', 'P', 'BELUM_MENIKAH', ?2, ?2)",
        rusqlite::params![m2_id, now],
    ).unwrap();

    let tgl_nikah = "2026-05-18";

    // Update status nikah kedua jemaat
    conn.execute(
        "UPDATE jemaat SET status_perkawinan = 'MENIKAH', tanggal_menikah = ?1 WHERE id IN (?2, ?3)",
        rusqlite::params![tgl_nikah, m1_id, m2_id],
    ).unwrap();

    // Verifikasi status pernikahan berubah
    let sp1: String = conn.query_row("SELECT status_perkawinan FROM jemaat WHERE id = ?1", [&m1_id], |r| r.get(0)).unwrap();
    let sp2: String = conn.query_row("SELECT status_perkawinan FROM jemaat WHERE id = ?1", [&m2_id], |r| r.get(0)).unwrap();
    let tn1: String = conn.query_row("SELECT tanggal_menikah FROM jemaat WHERE id = ?1", [&m1_id], |r| r.get(0)).unwrap();

    assert_eq!(sp1, "MENIKAH");
    assert_eq!(sp2, "MENIKAH");
    assert_eq!(tn1, tgl_nikah);
}

#[test]
fn test_atestasi_keluar_and_masuk() {
    let conn = init_memory_db().expect("Failed to init db");
    let now = Utc::now().to_rfc3339();

    let jemaat_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO jemaat (id, nomor_anggota, nama_lengkap, tanggal_lahir, jenis_kelamin, status_perkawinan, status_keanggotaan, created_at, updated_at)
         VALUES (?1, 'JM-2026-0604', 'Markus Tatengkeng', '1985-03-10', 'L', 'MENIKAH', 'AKTIF', ?2, ?2)",
        rusqlite::params![jemaat_id, now],
    ).unwrap();

    // 1. Catat atestasi keluar
    let rk_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO riwayat_keanggotaan (
            id, jemaat_id, status_sebelumnya, status_baru, tanggal_perubahan,
            alasan, jemaat_tujuan_asal, nomor_surat, created_at
        ) VALUES (?1, ?2, 'AKTIF', 'PINDAH', '2026-06-01', 'Pindah Domisili ke Manado', 'GMIST Petra Manado', 'AT-K/2026/001', ?3)",
        rusqlite::params![rk_id, jemaat_id, now],
    ).unwrap();

    conn.execute(
        "UPDATE jemaat SET status_keanggotaan = 'PINDAH' WHERE id = ?1",
        [&jemaat_id],
    ).unwrap();

    let status_after: String = conn.query_row(
        "SELECT status_keanggotaan FROM jemaat WHERE id = ?1",
        [&jemaat_id],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(status_after, "PINDAH");

    // 2. Catat atestasi masuk kembali
    let rk2_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO riwayat_keanggotaan (
            id, jemaat_id, status_sebelumnya, status_baru, tanggal_perubahan,
            alasan, jemaat_tujuan_asal, nomor_surat, created_at
        ) VALUES (?1, ?2, 'PINDAH', 'AKTIF', '2027-01-10', 'Kembali domisili Tahuna', 'GMIST Petra Manado', 'AT-M/2027/003', ?3)",
        rusqlite::params![rk2_id, jemaat_id, now],
    ).unwrap();

    conn.execute(
        "UPDATE jemaat SET status_keanggotaan = 'AKTIF', tanggal_masuk = '2027-01-10' WHERE id = ?1",
        [&jemaat_id],
    ).unwrap();

    let status_kembali: String = conn.query_row(
        "SELECT status_keanggotaan FROM jemaat WHERE id = ?1",
        [&jemaat_id],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(status_kembali, "AKTIF");
}

#[test]
fn test_pencatatan_kematian() {
    let conn = init_memory_db().expect("Failed to init db");
    let now = Utc::now().to_rfc3339();

    let jemaat_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO jemaat (id, nomor_anggota, nama_lengkap, tanggal_lahir, jenis_kelamin, status_perkawinan, status_keanggotaan, is_archived, created_at, updated_at)
         VALUES (?1, 'JM-2026-0605', 'Oma Maria Sasundu', '1938-12-05', 'P', 'CERAI_MATI', 'AKTIF', 0, ?2, ?2)",
        rusqlite::params![jemaat_id, now],
    ).unwrap();

    // Catat kematian
    let am_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO arsip_meninggal (
            id, jemaat_id, tanggal_meninggal, tempat_meninggal, tempat_pemakaman,
            pelayan_pemakaman, nomor_surat_kematian, keterangan, created_at
        ) VALUES (?1, ?2, '2026-07-15', 'RSUD Liun Kendage Tahuna', 'TPU Kolongan Akembawi', 'Pdt. M. Sasundu', 'SKM/2026/044', 'Tutup usia dalam damai sejahtera', ?3)",
        rusqlite::params![am_id, jemaat_id, now],
    ).unwrap();

    conn.execute(
        "UPDATE jemaat SET status_keanggotaan = 'MENINGGAL', tanggal_meninggal = '2026-07-15', is_archived = 1 WHERE id = ?1",
        [&jemaat_id],
    ).unwrap();

    // Verifikasi
    let (status, is_archived, tgl_m): (String, i32, Option<String>) = conn.query_row(
        "SELECT status_keanggotaan, is_archived, tanggal_meninggal FROM jemaat WHERE id = ?1",
        [&jemaat_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).unwrap();

    assert_eq!(status, "MENINGGAL");
    assert_eq!(is_archived, 1);
    assert_eq!(tgl_m, Some("2026-07-15".to_string()));

    let count_arsip: i64 = conn.query_row(
        "SELECT COUNT(*) FROM arsip_meninggal WHERE jemaat_id = ?1",
        [&jemaat_id],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(count_arsip, 1);
}
