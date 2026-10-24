use crate::db::init_memory_db;
use chrono::Utc;
use uuid::Uuid;

#[test]
fn test_keluarga_and_anggota_relationships() {
    let conn = init_memory_db().expect("Failed to init db");
    let now = Utc::now().to_rfc3339();

    // Create 2 jemaat: Suami (Kepala Keluarga) & Istri
    let suami_id = Uuid::new_v4().to_string();
    let istri_id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO jemaat (id, nomor_anggota, nama_lengkap, tanggal_lahir, jenis_kelamin, status_perkawinan, created_at, updated_at)
         VALUES (?1, 'JM-2026-0010', 'Marten Gaghana', '1985-03-10', 'L', 'MENIKAH', ?2, ?2)",
        rusqlite::params![suami_id, now],
    ).unwrap();

    conn.execute(
        "INSERT INTO jemaat (id, nomor_anggota, nama_lengkap, tanggal_lahir, jenis_kelamin, status_perkawinan, created_at, updated_at)
         VALUES (?1, 'JM-2026-0011', 'Debora Sasundu', '1987-08-20', 'P', 'MENIKAH', ?2, ?2)",
        rusqlite::params![istri_id, now],
    ).unwrap();

    // Create Keluarga
    let keluarga_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO keluarga (id, nomor_keluarga, nama_keluarga, kepala_keluarga_id, status, created_at, updated_at)
         VALUES (?1, 'KK-2026-0001', 'Gaghana - Sasundu', ?2, 'AKTIF', ?3, ?3)",
        rusqlite::params![keluarga_id, suami_id, now],
    ).unwrap();

    // Add members
    let ak1_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO anggota_keluarga (id, keluarga_id, jemaat_id, hubungan_keluarga, tanggal_mulai)
         VALUES (?1, ?2, ?3, 'KEPALA_KELUARGA', '2026-01-01')",
        rusqlite::params![ak1_id, keluarga_id, suami_id],
    ).unwrap();

    let ak2_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO anggota_keluarga (id, keluarga_id, jemaat_id, hubungan_keluarga, tanggal_mulai)
         VALUES (?1, ?2, ?3, 'ISTRI', '2026-01-01')",
        rusqlite::params![ak2_id, keluarga_id, istri_id],
    ).unwrap();

    // Verify member count is 2
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM anggota_keluarga WHERE keluarga_id = ?1",
        [&keluarga_id],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(count, 2);

    // Test unique constraint: cannot add the same jemaat twice to the same keluarga
    let duplicate_res = conn.execute(
        "INSERT INTO anggota_keluarga (id, keluarga_id, jemaat_id, hubungan_keluarga, tanggal_mulai)
         VALUES ('some-id', ?1, ?2, 'SUAMI', '2026-01-01')",
        rusqlite::params![keluarga_id, suami_id],
    );
    assert!(duplicate_res.is_err(), "Duplicate family member in same keluarga must violate unique constraint");
}

#[test]
fn test_remove_kepala_keluarga_nullifies_reference() {
    let conn = init_memory_db().expect("Failed to init db");
    let now = Utc::now().to_rfc3339();

    let jemaat_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO jemaat (id, nomor_anggota, nama_lengkap, tanggal_lahir, jenis_kelamin, status_perkawinan, created_at, updated_at)
         VALUES (?1, 'JM-2026-0020', 'Kepala Test', '1970-01-01', 'L', 'MENIKAH', ?2, ?2)",
        rusqlite::params![jemaat_id, now],
    ).unwrap();

    let keluarga_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO keluarga (id, nomor_keluarga, nama_keluarga, kepala_keluarga_id, status, created_at, updated_at)
         VALUES (?1, 'KK-2026-0002', 'Keluarga Test', ?2, 'AKTIF', ?3, ?3)",
        rusqlite::params![keluarga_id, jemaat_id, now],
    ).unwrap();

    let ak_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO anggota_keluarga (id, keluarga_id, jemaat_id, hubungan_keluarga, tanggal_mulai)
         VALUES (?1, ?2, ?3, 'KEPALA_KELUARGA', '2026-01-01')",
        rusqlite::params![ak_id, keluarga_id, jemaat_id],
    ).unwrap();

    // Remove the anggota_keluarga and set kepala_keluarga_id = NULL
    conn.execute("DELETE FROM anggota_keluarga WHERE id = ?1", [&ak_id]).unwrap();
    conn.execute("UPDATE keluarga SET kepala_keluarga_id = NULL WHERE id = ?1", [&keluarga_id]).unwrap();

    let kepala: Option<String> = conn.query_row(
        "SELECT kepala_keluarga_id FROM keluarga WHERE id = ?1",
        [&keluarga_id],
        |r| r.get(0),
    ).unwrap();
    assert!(kepala.is_none());
}
