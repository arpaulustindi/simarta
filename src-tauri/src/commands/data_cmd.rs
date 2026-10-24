use crate::audit::log_audit;
use crate::auth::Role;
use crate::commands::auth_cmd::verify_session;
use crate::db::DbState;
use crate::db::migrations::seed_dummy_data;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataSummaryResult {
    pub total_jemaat: usize,
    pub total_keluarga: usize,
    pub total_peristiwa: usize,
    pub total_pejabat: usize,
    pub dummy_status: String,
}

#[tauri::command]
pub fn get_data_summary(
    state: State<DbState>,
    token: String,
) -> Result<DataSummaryResult, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = verify_session(&conn, &token)?;

    let total_jemaat: usize = conn
        .query_row("SELECT COUNT(*) FROM jemaat WHERE is_archived = 0", [], |r| r.get(0))
        .unwrap_or(0);

    let total_keluarga: usize = conn
        .query_row("SELECT COUNT(*) FROM keluarga", [], |r| r.get(0))
        .unwrap_or(0);

    let total_peristiwa: usize = conn
        .query_row("SELECT COUNT(*) FROM riwayat_gerejawi", [], |r| r.get(0))
        .unwrap_or(0);

    let total_pejabat: usize = conn
        .query_row("SELECT COUNT(*) FROM riwayat_jabatan WHERE tanggal_selesai IS NULL", [], |r| r.get(0))
        .unwrap_or(0);

    let dummy_status: String = conn
        .query_row("SELECT value FROM app_settings WHERE key = 'dummy_data_status'", [], |r| r.get(0))
        .unwrap_or_else(|_| "active".to_string());

    Ok(DataSummaryResult {
        total_jemaat,
        total_keluarga,
        total_peristiwa,
        total_pejabat,
        dummy_status,
    })
}

#[tauri::command]
pub fn clear_dummy_data(
    state: State<DbState>,
    token: String,
) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mengosongkan data dummy".to_string());
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute("DELETE FROM anggota_keluarga", []).map_err(|e| e.to_string())?;
    tx.execute("UPDATE keluarga SET kepala_keluarga_id = NULL", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM keluarga", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM riwayat_gerejawi", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM riwayat_jabatan", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM riwayat_kelompok", []).map_err(|e| e.to_string())?;
    tx.execute("UPDATE jemaat SET pelka_id = NULL, kelompok_id = NULL", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM jemaat", []).map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM import_logs", []).map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();
    tx.execute(
        "INSERT OR REPLACE INTO app_settings (key, value, updated_at, updated_by) VALUES ('dummy_data_status', 'cleared', ?1, ?2)",
        rusqlite::params![now, current_user.id],
    ).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        "ADMIN",
        "DELETE",
        "system",
        None,
        None,
        None,
        "Mengosongkan seluruh data dummy jemaat, keluarga, dan catatan gerejawi",
        Some("Inisialisasi basis data bersih untuk GMIST Maranatha Tahuna"),
        None,
    );

    Ok(())
}

#[tauri::command]
pub fn seed_dummy_data_cmd(
    state: State<DbState>,
    token: String,
) -> Result<(), String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak memuat ulang data dummy".to_string());
    }

    // Clean existing transactional data first
    {
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM anggota_keluarga", []).map_err(|e| e.to_string())?;
        tx.execute("UPDATE keluarga SET kepala_keluarga_id = NULL", []).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM keluarga", []).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM riwayat_gerejawi", []).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM riwayat_jabatan", []).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM riwayat_kelompok", []).map_err(|e| e.to_string())?;
        tx.execute("UPDATE jemaat SET pelka_id = NULL, kelompok_id = NULL", []).map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM jemaat", []).map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())?;
    }

    seed_dummy_data(&conn).map_err(|e| e.to_string())?;

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        "ADMIN",
        "CREATE",
        "system",
        None,
        None,
        None,
        "Memuat ulang data dummy contoh GMIST Maranatha Tahuna",
        Some("Demonstrasi dan simulasi data"),
        None,
    );

    Ok(())
}
