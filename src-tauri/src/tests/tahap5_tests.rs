use crate::audit::log_audit;
use crate::auth::password::{hash_password, verify_password};
use crate::db::{init_db, init_memory_db};
use crate::pelka::calculate_pelka_recommendation;
use chrono::Utc;
use std::fs;
use uuid::Uuid;

#[test]
fn test_audit_log_filtering_and_pagination() {
    let conn = init_memory_db().expect("Failed to init db");
    let now = Utc::now().to_rfc3339();

    // Setup Admin user
    let admin_id = Uuid::new_v4().to_string();
    let hashed_pw = hash_password("AdminPass123!").unwrap();
    conn.execute(
        "INSERT INTO users (id, username, password_hash, role, full_name, is_active, created_at, created_by)
         VALUES (?1, 'admin_audit', ?2, 'ADMIN', 'Admin Audit Test', 1, ?3, ?1)",
        rusqlite::params![admin_id, hashed_pw, now],
    ).unwrap();

    // Insert 15 audit logs: 10 jemaat, 5 keluarga
    for i in 1..=15 {
        let action = if i % 2 == 0 { "CREATE" } else { "UPDATE" };
        let entity = if i <= 10 { "jemaat" } else { "keluarga" };
        let _ = log_audit(
            &conn,
            Some(&admin_id),
            "admin_audit",
            "ADMIN",
            action,
            entity,
            Some(&format!("entity-{}", i)),
            None,
            None,
            &format!("Catatan audit nomor {}", i),
            None,
            None,
        );
    }

    // Verify count query
    let total_records: usize = conn.query_row(
        "SELECT COUNT(*) FROM audit_logs",
        [],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(total_records, 15);

    // Verify entity filter
    let keluarga_count: usize = conn.query_row(
        "SELECT COUNT(*) FROM audit_logs WHERE entity = 'keluarga'",
        [],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(keluarga_count, 5);

    // Verify pagination (LIMIT 10 OFFSET 10) ordering by timestamp
    let mut stmt = conn.prepare("SELECT id FROM audit_logs ORDER BY timestamp DESC LIMIT 10 OFFSET 10").unwrap();
    let page2_items: Vec<String> = stmt.query_map([], |r| r.get(0)).unwrap().filter_map(|r| r.ok()).collect();
    assert_eq!(page2_items.len(), 5);
}

#[test]
fn test_database_backup_vacuum_into_and_integrity() {
    let temp_dir = std::env::temp_dir();
    let unique_id = Uuid::new_v4().to_string();
    let source_db_path = temp_dir.join(format!("simarta_test_source_{}.db", unique_id));
    let backup_db_path = temp_dir.join(format!("simarta_test_backup_{}.db", unique_id));

    // Initialize real file database
    let source_conn = init_db(&source_db_path).expect("Failed to init file db");
    let now = Utc::now().to_rfc3339();

    // Insert sample data
    let j_id = Uuid::new_v4().to_string();
    source_conn.execute(
        "INSERT INTO jemaat (id, nomor_anggota, nama_lengkap, tanggal_lahir, jenis_kelamin, status_perkawinan, created_at, updated_at)
         VALUES (?1, 'JM-2026-0999', 'Tes Backup Jemaat', '1985-05-10', 'L', 'MENIKAH', ?2, ?2)",
        rusqlite::params![j_id, now],
    ).unwrap();

    // Run native SQLite VACUUM INTO
    let backup_path_str = backup_db_path.to_string_lossy().to_string();
    source_conn.execute(
        &format!("VACUUM INTO '{}'", backup_path_str.replace('\'', "''")),
        [],
    ).expect("VACUUM INTO failed");

    assert!(backup_db_path.exists(), "Backup file was not created");

    // Verify backup integrity and content
    let backup_conn = rusqlite::Connection::open(&backup_db_path).expect("Failed to open backup");
    let integrity: String = backup_conn.query_row("PRAGMA integrity_check", [], |r| r.get(0)).unwrap();
    assert_eq!(integrity, "ok");

    let count: i64 = backup_conn.query_row(
        "SELECT COUNT(*) FROM jemaat WHERE nomor_anggota = 'JM-2026-0999'",
        [],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(count, 1);

    // Clean up temp files
    let _ = fs::remove_file(&source_db_path);
    let _ = fs::remove_file(&backup_db_path);
}

#[test]
fn test_batch_import_atomic_transaction_and_pelka() {
    let mut conn = init_memory_db().expect("Failed to init db");
    let now = Utc::now().to_rfc3339();

    // Verify atomic transaction handles batch insertion correctly
    let tx = conn.transaction().expect("Failed to begin tx");

    // Sample import rows
    let samples = vec![
        ("7103010101150001", "Anak Impor Satu", "2018-06-10", "L", "BELUM_MENIKAH"),
        ("7103010202080002", "Remaja Impor Dua", "2010-03-20", "P", "BELUM_MENIKAH"),
        ("7103010303800003", "Bapak Impor Tiga", "1980-01-01", "L", "MENIKAH"),
    ];

    for (idx, (nik, nama, tgl_lahir, jk, perkawinan)) in samples.iter().enumerate() {
        let j_id = Uuid::new_v4().to_string();
        let no_anggota = format!("JM-2026-{:04}", idx + 1);

        // Check Pelka auto-assignment
        let pelka_rec = calculate_pelka_recommendation(tgl_lahir, jk, perkawinan, None);
        let pelka_id: String = tx.query_row(
            "SELECT id FROM pelka WHERE kode = ?1",
            [&pelka_rec.kode],
            |r| r.get(0),
        ).unwrap();

        tx.execute(
            "INSERT INTO jemaat (id, nomor_anggota, nik, nama_lengkap, tanggal_lahir, jenis_kelamin, status_perkawinan, pelka_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)",
            rusqlite::params![j_id, no_anggota, nik, nama, tgl_lahir, jk, perkawinan, pelka_id, now],
        ).unwrap();
    }

    tx.commit().expect("Commit failed");

    // Verify 3 jemaat were inserted
    let count: usize = conn.query_row("SELECT COUNT(*) FROM jemaat", [], |r| r.get(0)).unwrap();
    assert_eq!(count, 3);

    // Verify Pelka assignments directly on jemaat table
    let pelka_anak_count: usize = conn.query_row(
        "SELECT COUNT(*) FROM jemaat j JOIN pelka p ON j.pelka_id = p.id WHERE p.kode = 'ANAK'",
        [],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(pelka_anak_count, 1);

    let pelka_remaja_count: usize = conn.query_row(
        "SELECT COUNT(*) FROM jemaat j JOIN pelka p ON j.pelka_id = p.id WHERE p.kode = 'REMAJA'",
        [],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(pelka_remaja_count, 1);

    let pelka_bapak_count: usize = conn.query_row(
        "SELECT COUNT(*) FROM jemaat j JOIN pelka p ON j.pelka_id = p.id WHERE p.kode = 'BAPAK'",
        [],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(pelka_bapak_count, 1);
}

#[test]
fn test_user_password_change_and_status() {
    let conn = init_memory_db().expect("Failed to init db");
    let now = Utc::now().to_rfc3339();

    let user_id = Uuid::new_v4().to_string();
    let initial_hash = hash_password("OldPassword123!").unwrap();
    conn.execute(
        "INSERT INTO users (id, username, password_hash, role, full_name, is_active, created_at, created_by)
         VALUES (?1, 'operator_user', ?2, 'OPERATOR', 'Operator Tester', 1, ?3, ?1)",
        rusqlite::params![user_id, initial_hash, now],
    ).unwrap();

    // Verify initial password
    let stored_hash: String = conn.query_row(
        "SELECT password_hash FROM users WHERE id = ?1",
        [&user_id],
        |r| r.get(0),
    ).unwrap();
    assert!(verify_password("OldPassword123!", &stored_hash).unwrap());

    // Update password
    let new_hash = hash_password("NewSecurePassword456!").unwrap();
    conn.execute(
        "UPDATE users SET password_hash = ?1 WHERE id = ?2",
        rusqlite::params![new_hash, user_id],
    ).unwrap();

    let updated_hash: String = conn.query_row(
        "SELECT password_hash FROM users WHERE id = ?1",
        [&user_id],
        |r| r.get(0),
    ).unwrap();
    assert!(!verify_password("OldPassword123!", &updated_hash).unwrap());
    assert!(verify_password("NewSecurePassword456!", &updated_hash).unwrap());

    // Test Deactivate user & clear sessions
    conn.execute(
        "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
         VALUES (?1, ?2, 'hash123', '2099-01-01', ?3)",
        rusqlite::params![Uuid::new_v4().to_string(), user_id, now],
    ).unwrap();

    conn.execute("UPDATE users SET is_active = 0 WHERE id = ?1", [&user_id]).unwrap();
    conn.execute("DELETE FROM sessions WHERE user_id = ?1", [&user_id]).unwrap();

    let is_active: i32 = conn.query_row("SELECT is_active FROM users WHERE id = ?1", [&user_id], |r| r.get(0)).unwrap();
    assert_eq!(is_active, 0);

    let session_count: i64 = conn.query_row("SELECT COUNT(*) FROM sessions WHERE user_id = ?1", [&user_id], |r| r.get(0)).unwrap();
    assert_eq!(session_count, 0);
}
