use crate::db::init_memory_db;
use crate::pelka::calculate_pelka_recommendation;
use chrono::Utc;
use uuid::Uuid;

#[test]
fn test_jemaat_creation_and_duplicate_detection() {
    let conn = init_memory_db().expect("Failed to init db");

    let jemaat_id = Uuid::new_v4().to_string();
    let nik = "7103011234560001";
    let nama = "Jonathan Tatengkeng";
    let tgl_lahir = "1994-05-15";
    let now = Utc::now().to_rfc3339();

    // Insert jemaat
    conn.execute(
        "INSERT INTO jemaat (
            id, nomor_anggota, nik, nama_lengkap, tanggal_lahir, jenis_kelamin,
            status_perkawinan, status_keanggotaan, is_archived, created_at, updated_at
        ) VALUES (?1, 'JM-2026-0001', ?2, ?3, ?4, 'L', 'BELUM_MENIKAH', 'AKTIF', 0, ?5, ?5)",
        rusqlite::params![jemaat_id, nik, nama, tgl_lahir, now],
    )
    .unwrap();

    // 1. Check duplicate by NIK
    let row_nik: Result<(String, String), _> = conn.query_row(
        "SELECT id, nama_lengkap FROM jemaat WHERE nik = ?1 AND is_archived = 0",
        [nik],
        |r| Ok((r.get(0)?, r.get(1)?)),
    );
    assert!(row_nik.is_ok());
    assert_eq!(row_nik.unwrap().1, nama);

    // 2. Check duplicate by Case-Insensitive Name and Birth Date
    let row_name: Result<(String, String), _> = conn.query_row(
        "SELECT id, nama_lengkap FROM jemaat WHERE LOWER(nama_lengkap) = LOWER(?1) AND tanggal_lahir = ?2 AND is_archived = 0",
        ["jonathan tatengkeng", tgl_lahir],
        |r| Ok((r.get(0)?, r.get(1)?)),
    );
    assert!(row_name.is_ok());

    // 3. Check Pelka recommendation on this jemaat
    let rec = calculate_pelka_recommendation(tgl_lahir, "L", "BELUM_MENIKAH", None);
    assert_eq!(rec.kode, "PEMUDA");
}

#[test]
fn test_jemaat_archival_soft_delete() {
    let conn = init_memory_db().expect("Failed to init db");

    let jemaat_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO jemaat (
            id, nomor_anggota, nama_lengkap, tanggal_lahir, jenis_kelamin,
            status_perkawinan, status_keanggotaan, is_archived, created_at, updated_at
        ) VALUES (?1, 'JM-2026-0002', 'Test Archive', '1980-01-01', 'L', 'MENIKAH', 'AKTIF', 0, ?2, ?2)",
        rusqlite::params![jemaat_id, now],
    )
    .unwrap();

    // Verify active count is 1
    let active_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM jemaat WHERE is_archived = 0", [], |r| r.get(0))
        .unwrap();
    assert_eq!(active_count, 1);

    // Archive jemaat
    conn.execute("UPDATE jemaat SET is_archived = 1 WHERE id = ?1", [&jemaat_id]).unwrap();

    let active_after: i64 = conn
        .query_row("SELECT COUNT(*) FROM jemaat WHERE is_archived = 0", [], |r| r.get(0))
        .unwrap();
    assert_eq!(active_after, 0);

    let archived_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM jemaat WHERE is_archived = 1", [], |r| r.get(0))
        .unwrap();
    assert_eq!(archived_count, 1);
}
