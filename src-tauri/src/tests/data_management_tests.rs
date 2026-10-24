use crate::db::init_memory_db;
use crate::db::migrations::seed_dummy_data;
use chrono::Utc;

#[test]
fn test_dummy_data_initialization_and_clearing() {
    let mut conn = init_memory_db().expect("Failed to initialize in-memory database");
    seed_dummy_data(&conn).expect("Failed to seed dummy data");

    // 1. Initial seed should automatically populate 10 jemaat, 3 keluarga, 6 peristiwa, 3 pejabat
    let jemaat_count: i64 = conn.query_row("SELECT COUNT(*) FROM jemaat", [], |r| r.get(0)).unwrap();
    let keluarga_count: i64 = conn.query_row("SELECT COUNT(*) FROM keluarga", [], |r| r.get(0)).unwrap();
    let peristiwa_count: i64 = conn.query_row("SELECT COUNT(*) FROM riwayat_gerejawi", [], |r| r.get(0)).unwrap();
    let pejabat_count: i64 = conn.query_row("SELECT COUNT(*) FROM riwayat_jabatan", [], |r| r.get(0)).unwrap();
    let kelompok_count: i64 = conn.query_row("SELECT COUNT(*) FROM kelompok", [], |r| r.get(0)).unwrap();
    let pelka_count: i64 = conn.query_row("SELECT COUNT(*) FROM pelka", [], |r| r.get(0)).unwrap();
    let jabatan_count: i64 = conn.query_row("SELECT COUNT(*) FROM jabatan", [], |r| r.get(0)).unwrap();

    assert_eq!(jemaat_count, 10);
    assert_eq!(keluarga_count, 3);
    assert_eq!(peristiwa_count, 6);
    assert_eq!(pejabat_count, 3);
    assert_eq!(kelompok_count, 12);
    assert_eq!(pelka_count, 6);
    assert_eq!(jabatan_count, 8);

    let status: String = conn
        .query_row("SELECT value FROM app_settings WHERE key = 'dummy_data_status'", [], |r| r.get(0))
        .unwrap();
    assert_eq!(status, "active");

    // 2. Perform atomic clear of dummy transactional data
    {
        let tx = conn.transaction().unwrap();
        tx.execute("DELETE FROM anggota_keluarga", []).unwrap();
        tx.execute("UPDATE keluarga SET kepala_keluarga_id = NULL", []).unwrap();
        tx.execute("DELETE FROM keluarga", []).unwrap();
        tx.execute("DELETE FROM riwayat_gerejawi", []).unwrap();
        tx.execute("DELETE FROM riwayat_jabatan", []).unwrap();
        tx.execute("DELETE FROM riwayat_kelompok", []).unwrap();
        tx.execute("UPDATE jemaat SET pelka_id = NULL, kelompok_id = NULL", []).unwrap();
        tx.execute("DELETE FROM jemaat", []).unwrap();
        tx.execute("DELETE FROM import_logs", []).unwrap();

        let now = Utc::now().to_rfc3339();
        tx.execute(
            "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('dummy_data_status', 'cleared', ?1)",
            [&now],
        ).unwrap();

        tx.commit().unwrap();
    }

    // 3. Verify that transactional data is cleared, but master tables remain intact
    let jemaat_cleared: i64 = conn.query_row("SELECT COUNT(*) FROM jemaat", [], |r| r.get(0)).unwrap();
    let keluarga_cleared: i64 = conn.query_row("SELECT COUNT(*) FROM keluarga", [], |r| r.get(0)).unwrap();
    let peristiwa_cleared: i64 = conn.query_row("SELECT COUNT(*) FROM riwayat_gerejawi", [], |r| r.get(0)).unwrap();
    let pejabat_cleared: i64 = conn.query_row("SELECT COUNT(*) FROM riwayat_jabatan", [], |r| r.get(0)).unwrap();
    let kelompok_still_intact: i64 = conn.query_row("SELECT COUNT(*) FROM kelompok", [], |r| r.get(0)).unwrap();
    let pelka_still_intact: i64 = conn.query_row("SELECT COUNT(*) FROM pelka", [], |r| r.get(0)).unwrap();

    assert_eq!(jemaat_cleared, 0);
    assert_eq!(keluarga_cleared, 0);
    assert_eq!(peristiwa_cleared, 0);
    assert_eq!(pejabat_cleared, 0);
    assert_eq!(kelompok_still_intact, 12);
    assert_eq!(pelka_still_intact, 6);

    let status_cleared: String = conn
        .query_row("SELECT value FROM app_settings WHERE key = 'dummy_data_status'", [], |r| r.get(0))
        .unwrap();
    assert_eq!(status_cleared, "cleared");

    // 4. Test re-seeding dummy data
    seed_dummy_data(&conn).expect("Failed to re-seed dummy data");

    let jemaat_reloaded: i64 = conn.query_row("SELECT COUNT(*) FROM jemaat", [], |r| r.get(0)).unwrap();
    let keluarga_reloaded: i64 = conn.query_row("SELECT COUNT(*) FROM keluarga", [], |r| r.get(0)).unwrap();
    let status_reloaded: String = conn
        .query_row("SELECT value FROM app_settings WHERE key = 'dummy_data_status'", [], |r| r.get(0))
        .unwrap();

    assert_eq!(jemaat_reloaded, 10);
    assert_eq!(keluarga_reloaded, 3);
    assert_eq!(status_reloaded, "active");
}
