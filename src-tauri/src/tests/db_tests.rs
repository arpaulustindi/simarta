use crate::db::init_memory_db;

#[test]
fn test_database_initialization_and_seeding() {
    let conn = init_memory_db().expect("Failed to init in-memory database");

    // Verify 6 default Pelka records exist
    let pelka_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM pelka", [], |r| r.get(0))
        .unwrap();
    assert_eq!(pelka_count, 6);

    // Verify 12 default Kelompok records exist
    let kelompok_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM kelompok", [], |r| r.get(0))
        .unwrap();
    assert_eq!(kelompok_count, 12);

    // Verify 8 default Jabatan records exist
    let jabatan_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM jabatan", [], |r| r.get(0))
        .unwrap();
    assert_eq!(jabatan_count, 8);
}

#[test]
fn test_foreign_key_enforcement() {
    let conn = init_memory_db().expect("Failed to init in-memory database");

    // Inserting jemaat with non-existent kelompok_id should fail
    let res = conn.execute(
        "INSERT INTO jemaat (
            id, nomor_anggota, nama_lengkap, tanggal_lahir, jenis_kelamin,
            status_perkawinan, status_keanggotaan, is_archived, kelompok_id,
            created_at, updated_at
        ) VALUES (
            'test-id', 'NA-001', 'Test Jemaat', '2000-01-01', 'L',
            'BELUM_MENIKAH', 'AKTIF', 0, 'non-existent-kelompok',
            '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'
        )",
        [],
    );

    assert!(res.is_err(), "Foreign key violation must result in error");
}
