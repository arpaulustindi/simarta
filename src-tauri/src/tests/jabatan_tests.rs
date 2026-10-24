use crate::db::init_memory_db;
use chrono::Utc;
use uuid::Uuid;

#[test]
fn test_jabatan_seeding_and_appointments() {
    let conn = init_memory_db().expect("Failed to init db");
    let now = Utc::now().to_rfc3339();

    // Verify 8 default jabatan exist
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM jabatan", [], |r| r.get(0)).unwrap();
    assert_eq!(count, 8);

    // Get Penatua ID
    let penatua_id: String = conn.query_row(
        "SELECT id FROM jabatan WHERE nama_jabatan = 'Penatua'",
        [],
        |r| r.get(0),
    ).unwrap();

    // Create a jemaat
    let jemaat_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO jemaat (id, nomor_anggota, nama_lengkap, tanggal_lahir, jenis_kelamin, status_perkawinan, created_at, updated_at)
         VALUES (?1, 'JM-2026-0500', 'Pnt. Jonathan Tatengkeng', '1980-01-01', 'L', 'MENIKAH', ?2, ?2)",
        rusqlite::params![jemaat_id, now],
    ).unwrap();

    // Appoint as Penatua (Lingkup JEMAAT)
    let riwayat_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO riwayat_jabatan (
            id, jemaat_id, jabatan_id, lingkup, tanggal_pengangkatan, keterangan, created_at
        ) VALUES (?1, ?2, ?3, 'JEMAAT', '2026-01-01', 'SK Pelayan Khusus Periode 2026-2030', ?4)",
        rusqlite::params![riwayat_id, jemaat_id, penatua_id, now],
    ).unwrap();

    // Verify active official exists
    let active_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM riwayat_jabatan WHERE jemaat_id = ?1 AND (tanggal_berakhir IS NULL OR tanggal_berakhir > '2026-01-01')",
        [&jemaat_id],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(active_count, 1);

    // End term of office
    conn.execute(
        "UPDATE riwayat_jabatan SET tanggal_berakhir = '2030-12-31' WHERE id = ?1",
        [&riwayat_id],
    ).unwrap();

    let end_date: Option<String> = conn.query_row(
        "SELECT tanggal_berakhir FROM riwayat_jabatan WHERE id = ?1",
        [&riwayat_id],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(end_date, Some("2030-12-31".to_string()));
}
