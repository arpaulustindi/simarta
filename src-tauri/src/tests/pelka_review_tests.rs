use crate::db::init_memory_db;
use crate::pelka::calculate_pelka_recommendation;
use chrono::Utc;
use uuid::Uuid;

#[test]
fn test_pelka_review_queue_detection() {
    let conn = init_memory_db().expect("Failed to init db");
    let now = Utc::now().to_rfc3339();

    // Get Pelka Anak and Pelka Remaja IDs
    let pelka_anak_id: String = conn.query_row(
        "SELECT id FROM pelka WHERE kode = 'ANAK'",
        [],
        |r| r.get(0),
    ).unwrap();

    let pelka_remaja_id: String = conn.query_row(
        "SELECT id FROM pelka WHERE kode = 'REMAJA'",
        [],
        |r| r.get(0),
    ).unwrap();

    // Create jemaat who turned 14 years old (born 2012), but still registered in Pelka Anak
    let jemaat_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO jemaat (
            id, nomor_anggota, nama_lengkap, tanggal_lahir, jenis_kelamin,
            status_perkawinan, status_keanggotaan, pelka_id, is_archived, created_at, updated_at
        ) VALUES (?1, 'JM-2026-0099', 'Anak Bertumbuh Remaja', '2012-01-01', 'L', 'BELUM_MENIKAH', 'AKTIF', ?2, 0, ?3, ?3)",
        rusqlite::params![jemaat_id, pelka_anak_id, now],
    ).unwrap();

    // Calculate recommendation: should be REMAJA
    let rec = calculate_pelka_recommendation("2012-01-01", "L", "BELUM_MENIKAH", None);
    assert_eq!(rec.kode, "REMAJA");

    // Current pelka is ANAK, so it IS a mismatch!
    let cur_pelka_kode: String = conn.query_row(
        "SELECT p.kode FROM jemaat j JOIN pelka p ON j.pelka_id = p.id WHERE j.id = ?1",
        [&jemaat_id],
        |r| r.get(0),
    ).unwrap();
    assert_ne!(cur_pelka_kode, rec.kode);

    // Apply manual mutation to Pelka Remaja
    conn.execute(
        "UPDATE jemaat SET pelka_id = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![pelka_remaja_id, now, jemaat_id],
    ).unwrap();

    // Verify after mutation: now matches REMAJA
    let updated_kode: String = conn.query_row(
        "SELECT p.kode FROM jemaat j JOIN pelka p ON j.pelka_id = p.id WHERE j.id = ?1",
        [&jemaat_id],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(updated_kode, "REMAJA");
}
