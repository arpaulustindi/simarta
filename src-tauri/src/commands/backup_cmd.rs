use crate::audit::log_audit;
use crate::auth::Role;
use crate::commands::auth_cmd::verify_session;
use crate::db::DbState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupFileInfo {
    pub file_name: String,
    pub file_path: String,
    pub file_size_bytes: u64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupResult {
    pub backup_path: String,
    pub file_name: String,
    pub file_size_bytes: u64,
    pub created_at: String,
}

fn get_backups_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Gagal mengakses direktori aplikasi: {}", e))?;
    let backups_dir = app_data.join("backups");
    if !backups_dir.exists() {
        fs::create_dir_all(&backups_dir)
            .map_err(|e| format!("Gagal membuat direktori backups: {}", e))?;
    }
    Ok(backups_dir)
}

#[tauri::command]
pub fn create_database_backup(
    app: AppHandle,
    state: State<DbState>,
    token: String,
    custom_folder: Option<String>,
) -> Result<BackupResult, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak membuat backup database".to_string());
    }

    let timestamp_str = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let file_name = format!("simarta_backup_{}.db", timestamp_str);

    let target_dir = match custom_folder {
        Some(cf) if !cf.trim().is_empty() => PathBuf::from(cf.trim()),
        _ => get_backups_dir(&app)?,
    };

    if !target_dir.exists() {
        fs::create_dir_all(&target_dir)
            .map_err(|e| format!("Direktori tujuan backup tidak dapat dibuat: {}", e))?;
    }

    let target_file_path = target_dir.join(&file_name);
    let target_path_str = target_file_path.to_string_lossy().to_string();

    // Jalankan SQLite atomic VACUUM INTO
    let sql = format!("VACUUM INTO '{}'", target_path_str.replace('\'', "''"));
    conn.execute(&sql, [])
        .map_err(|e| format!("Gagal mengeksekusi backup database: {}", e))?;

    let file_size_bytes = fs::metadata(&target_file_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let created_at = Utc::now().to_rfc3339();

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "BACKUP",
        "database",
        None,
        None,
        Some(&format!("{{\"file_name\": \"{}\", \"size\": {}}}", file_name, file_size_bytes)),
        &format!("Pembuatan backup database mandiri: {}", file_name),
        Some("Backup rutin oleh Administrator"),
        None,
    );

    Ok(BackupResult {
        backup_path: target_path_str,
        file_name,
        file_size_bytes,
        created_at,
    })
}

#[tauri::command]
pub fn list_backups(
    app: AppHandle,
    state: State<DbState>,
    token: String,
) -> Result<Vec<BackupFileInfo>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak melihat daftar backup".to_string());
    }

    let backups_dir = get_backups_dir(&app)?;
    let mut files = Vec::new();

    if let Ok(entries) = fs::read_dir(backups_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext == "db" || ext == "sqlite" {
                        let file_name = path
                            .file_name()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string();
                        let metadata = fs::metadata(&path).ok();
                        let file_size_bytes = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
                        let created_at = metadata
                            .and_then(|m| m.created().or_else(|_| m.modified()).ok())
                            .map(|t| chrono::DateTime::<Utc>::from(t).to_rfc3339())
                            .unwrap_or_else(|| Utc::now().to_rfc3339());

                        files.push(BackupFileInfo {
                            file_name,
                            file_path: path.to_string_lossy().to_string(),
                            file_size_bytes,
                            created_at,
                        });
                    }
                }
            }
        }
    }

    // Sort newest first
    files.sort_by(|a, b| b.file_name.cmp(&a.file_name));

    Ok(files)
}

#[tauri::command]
pub fn restore_database_from_backup(
    app: AppHandle,
    state: State<DbState>,
    token: String,
    backup_path: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak memulihkan database".to_string());
    }

    let b_path = Path::new(&backup_path);
    if !b_path.exists() {
        return Err("File backup yang dipilih tidak ditemukan".to_string());
    }

    // 1. Verifikasi integritas database backup yang akan dipulihkan
    let verify_conn = rusqlite::Connection::open_with_flags(
        b_path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
    )
    .map_err(|e| format!("File backup tidak dapat dibuka atau korup: {}", e))?;

    let check_tables: i64 = verify_conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('users', 'jemaat', 'keluarga', 'pelka')",
            [],
            |r| r.get(0),
        )
        .map_err(|_| "Struktur file backup tidak valid untuk SiMarta".to_string())?;

    if check_tables < 4 {
        return Err("File backup tidak memiliki struktur database SiMarta yang sah".to_string());
    }

    drop(verify_conn);

    // 2. Buat safety backup dari database saat ini sebelum ditimpa
    let safety_time = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let backups_dir = get_backups_dir(&app)?;
    let safety_file = backups_dir.join(format!("safety_pre_restore_{}.db", safety_time));
    let safety_sql = format!(
        "VACUUM INTO '{}'",
        safety_file.to_string_lossy().replace('\'', "''")
    );
    let _ = conn.execute(&safety_sql, []);

    // 3. Ambil lokasi simarta.db aktif
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Gagal mengakses direktori aplikasi: {}", e))?;
    let active_db_path = app_data.join("simarta.db");

    // Close current connection locks by copying directly or re-attaching
    // Di SQLite WAL, salin file backup ke lokasi aktif membutuhkan flush
    let _ = conn.execute("PRAGMA wal_checkpoint(TRUNCATE)", []);
    drop(conn); // Release lock

    // Ganti file database aktif dengan file backup
    fs::copy(&b_path, &active_db_path)
        .map_err(|e| format!("Gagal memulihkan database dari file backup: {}", e))?;

    // Hapus wal dan shm lama jika ada agar bersih
    let _ = fs::remove_file(app_data.join("simarta.db-wal"));
    let _ = fs::remove_file(app_data.join("simarta.db-shm"));

    // Buka kembali koneksi database baru
    let mut new_conn_guard = state.0.lock().map_err(|e| e.to_string())?;
    let new_conn = crate::db::init_db(&active_db_path)
        .map_err(|e| format!("Gagal membuka kembali database hasil pemulihan: {}", e))?;
    *new_conn_guard = new_conn;

    let _ = log_audit(
        &new_conn_guard,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "RESTORE",
        "database",
        None,
        None,
        Some(&format!("{{\"restored_from\": \"{}\"}}", backup_path)),
        &format!("Pemulihan (Restore) database berhasil dari: {}", backup_path),
        Some("Pemulihan cadangan data gereja"),
        None,
    );

    Ok(())
}
