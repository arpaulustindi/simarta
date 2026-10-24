use crate::db::init_memory_db;
use chrono::Utc;
use uuid::Uuid;

#[test]
fn test_kelompok_listing_and_relocation_history() {
    let conn = init_memory_db().expect("Failed to init db");
    let now = Utc::now().to_rfc3339();

    // Verify 12 kelompok are seeded
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM kelompok", [], |r| r.get(0)).unwrap();
    assert_eq!(count, 12);

    // Get Kelompok 01 and Kelompok 02 IDs
    let k1_id: String = conn.query_row(
        "SELECT id FROM kelompok WHERE nomor_kelompok = '01'",
        [],
        |r| r.get(0),
    ).unwrap();

    let k2_id: String = conn.query_row(
        "SELECT id FROM kelompok WHERE nomor_kelompok = '02'",
        [],
        |r| r.get(0),
    ).unwrap();

    // Create jemaat assigned to Kelompok 01
    let jemaat_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO jemaat (
            id, nomor_anggota, nama_lengkap, tanggal_lahir, jenis_kelamin,
            status_perkawinan, kelompok_id, created_at, updated_at
        ) VALUES (?1, 'JM-2026-0030', 'Pindah Kelompok Test', '1990-01-01', 'L', 'BELUM_MENIKAH', ?2, ?3, ?3)",
        rusqlite::params![jemaat_id, k1_id, now],
    ).unwrap();

    // Record relocation to Kelompok 02
    let riwayat_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO riwayat_kelompok (
            id, jemaat_id, kelompok_asal_id, kelompok_tujuan_id, tanggal_perpindahan, alasan, created_at
        ) VALUES (?1, ?2, ?3, ?4, '2026-06-01', 'Pindah domisili rumah', ?5)",
        rusqlite::params![riwayat_id, jemaat_id, k1_id, k2_id, now],
    ).unwrap();

    conn.execute(
        "UPDATE jemaat SET kelompok_id = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![k2_id, now, jemaat_id],
    ).unwrap();

    // Verify jemaat is now in Kelompok 02
    let current_k_id: String = conn.query_row(
        "SELECT kelompok_id FROM jemaat WHERE id = ?1",
        [&jemaat_id],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(current_k_id, k2_id);

    // Verify history entry exists
    let history_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM riwayat_kelompok WHERE jemaat_id = ?1",
        [&jemaat_id],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(history_count, 1);
}
