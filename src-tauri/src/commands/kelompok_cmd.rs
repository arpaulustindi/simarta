use crate::audit::log_audit;
use crate::auth::Role;
use crate::commands::auth_cmd::verify_session;
use crate::db::DbState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KelompokListItem {
    pub id: String,
    pub nomor_kelompok: String,
    pub nama_kelompok: String,
    pub deskripsi: Option<String>,
    pub is_active: bool,
    pub jumlah_jemaat: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KelompokJemaatItem {
    pub id: String,
    pub nomor_anggota: String,
    pub nama_lengkap: String,
    pub jenis_kelamin: String,
    pub tanggal_lahir: String,
    pub status_perkawinan: String,
    pub status_keanggotaan: String,
    pub nama_pelka: Option<String>,
    pub alamat: Option<String>,
    pub nomor_telepon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KelompokDetail {
    pub id: String,
    pub nomor_kelompok: String,
    pub nama_kelompok: String,
    pub deskripsi: Option<String>,
    pub is_active: bool,
    pub jemaat_list: Vec<KelompokJemaatItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveKelompokInput {
    pub jemaat_id: String,
    pub kelompok_tujuan_id: String,
    pub tanggal_perpindahan: String,
    pub alasan: Option<String>,
}

#[tauri::command]
pub fn list_kelompok(
    state: State<DbState>,
    token: String,
) -> Result<Vec<KelompokListItem>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = verify_session(&conn, &token)?;

    let mut stmt = conn
        .prepare(
            "SELECT k.id, k.nomor_kelompok, k.nama_kelompok, k.deskripsi, k.is_active,
                    (SELECT COUNT(*) FROM jemaat j WHERE j.kelompok_id = k.id AND j.is_archived = 0) as jml_jemaat
             FROM kelompok k
             ORDER BY k.nomor_kelompok ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |r| {
            let is_active_int: i32 = r.get(4)?;
            let jml: i64 = r.get(5)?;
            Ok(KelompokListItem {
                id: r.get(0)?,
                nomor_kelompok: r.get(1)?,
                nama_kelompok: r.get(2)?,
                deskripsi: r.get(3)?,
                is_active: is_active_int == 1,
                jumlah_jemaat: jml as usize,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }

    Ok(items)
}

#[tauri::command]
pub fn get_kelompok_detail(
    state: State<DbState>,
    token: String,
    id: String,
) -> Result<KelompokDetail, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = verify_session(&conn, &token)?;

    let mut stmt = conn
        .prepare(
            "SELECT id, nomor_kelompok, nama_kelompok, deskripsi, is_active
             FROM kelompok WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let mut detail = stmt
        .query_row([&id], |r| {
            let is_active_int: i32 = r.get(4)?;
            Ok(KelompokDetail {
                id: r.get(0)?,
                nomor_kelompok: r.get(1)?,
                nama_kelompok: r.get(2)?,
                deskripsi: r.get(3)?,
                is_active: is_active_int == 1,
                jemaat_list: Vec::new(),
            })
        })
        .map_err(|_| "Data kelompok tidak ditemukan".to_string())?;

    let mut jemaat_stmt = conn
        .prepare(
            "SELECT j.id, j.nomor_anggota, j.nama_lengkap, j.jenis_kelamin, j.tanggal_lahir,
                    j.status_perkawinan, j.status_keanggotaan, p.nama_pelka, j.alamat, j.nomor_telepon
             FROM jemaat j
             LEFT JOIN pelka p ON j.pelka_id = p.id
             WHERE j.kelompok_id = ?1 AND j.is_archived = 0
             ORDER BY j.nama_lengkap ASC",
        )
        .map_err(|e| e.to_string())?;

    let jemaat_rows = jemaat_stmt
        .query_map([&id], |r| {
            Ok(KelompokJemaatItem {
                id: r.get(0)?,
                nomor_anggota: r.get(1)?,
                nama_lengkap: r.get(2)?,
                jenis_kelamin: r.get(3)?,
                tanggal_lahir: r.get(4)?,
                status_perkawinan: r.get(5)?,
                status_keanggotaan: r.get(6)?,
                nama_pelka: r.get(7)?,
                alamat: r.get(8)?,
                nomor_telepon: r.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    for j in jemaat_rows {
        if let Ok(item) = j {
            detail.jemaat_list.push(item);
        }
    }

    Ok(detail)
}

#[tauri::command]
pub fn move_jemaat_kelompok(
    state: State<DbState>,
    token: String,
    input: MoveKelompokInput,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak memindahkan kelompok ibadah jemaat".to_string());
    }

    if input.tanggal_perpindahan.trim().is_empty() {
        return Err("Tanggal perpindahan wajib diisi".to_string());
    }

    // Ambil kelompok asal jemaat saat ini
    let (nama_lengkap, kelompok_asal_id): (String, Option<String>) = conn
        .query_row(
            "SELECT nama_lengkap, kelompok_id FROM jemaat WHERE id = ?1",
            [&input.jemaat_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|_| "Data jemaat tidak ditemukan".to_string())?;

    if let Some(ref asal) = kelompok_asal_id {
        if asal == &input.kelompok_tujuan_id {
            return Err("Kelompok tujuan sama dengan kelompok jemaat saat ini".to_string());
        }
    }

    // Ambil nama kelompok tujuan
    let nama_kelompok_tujuan: String = conn
        .query_row(
            "SELECT nama_kelompok FROM kelompok WHERE id = ?1",
            [&input.kelompok_tujuan_id],
            |r| r.get(0),
        )
        .map_err(|_| "Kelompok tujuan tidak ditemukan".to_string())?;

    let riwayat_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Insert ke riwayat_kelompok
    conn.execute(
        "INSERT INTO riwayat_kelompok (
            id, jemaat_id, kelompok_asal_id, kelompok_tujuan_id,
            tanggal_perpindahan, alasan, recorded_by, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            riwayat_id,
            input.jemaat_id,
            kelompok_asal_id,
            input.kelompok_tujuan_id,
            input.tanggal_perpindahan.trim(),
            input.alasan.as_ref().map(|a| a.trim().to_string()),
            current_user.id,
            now
        ],
    )
    .map_err(|e| format!("Gagal mencatat riwayat perpindahan kelompok: {}", e))?;

    // Update jemaat.kelompok_id
    conn.execute(
        "UPDATE jemaat SET kelompok_id = ?1, updated_at = ?2, updated_by = ?3 WHERE id = ?4",
        rusqlite::params![input.kelompok_tujuan_id, now, current_user.id, input.jemaat_id],
    )
    .map_err(|e| format!("Gagal memperbarui kelompok jemaat: {}", e))?;

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "UPDATE",
        "jemaat",
        Some(&input.jemaat_id),
        kelompok_asal_id.as_deref(),
        Some(&input.kelompok_tujuan_id),
        &format!("Pemindahan kelompok jemaat: {} ke {}", nama_lengkap, nama_kelompok_tujuan),
        input.alasan.as_deref(),
        None,
    );

    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateKelompokInput {
    pub nomor_kelompok: String,
    pub nama_kelompok: String,
    pub deskripsi: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateKelompokInput {
    pub id: String,
    pub nomor_kelompok: String,
    pub nama_kelompok: String,
    pub deskripsi: Option<String>,
    pub is_active: bool,
}

#[tauri::command]
pub fn create_kelompok(
    state: State<DbState>,
    token: String,
    input: CreateKelompokInput,
) -> Result<KelompokListItem, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak menambah kelompok ibadah baru".to_string());
    }

    let nomor = input.nomor_kelompok.trim();
    let nama = input.nama_kelompok.trim();

    if nomor.is_empty() {
        return Err("Nomor kelompok wajib diisi (contoh: 01, 13)".to_string());
    }
    if nama.is_empty() {
        return Err("Nama kelompok wajib diisi (contoh: Kelompok 13)".to_string());
    }

    // Cek duplikasi nomor kelompok
    let existing_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM kelompok WHERE nomor_kelompok = ?1",
            [nomor],
            |r| r.get(0),
        )
        .unwrap_or(0);

    if existing_count > 0 {
        return Err(format!("Nomor kelompok '{}' sudah digunakan. Gunakan nomor kelompok lain.", nomor));
    }

    let new_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let deskripsi_clean = input.deskripsi.as_ref().map(|d| d.trim().to_string()).filter(|d| !d.is_empty());

    conn.execute(
        "INSERT INTO kelompok (id, nomor_kelompok, nama_kelompok, deskripsi, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6)",
        rusqlite::params![
            new_id,
            nomor,
            nama,
            deskripsi_clean,
            now,
            now
        ],
    )
    .map_err(|e| format!("Gagal menambahkan kelompok ibadah: {}", e))?;

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "CREATE",
        "kelompok",
        Some(&new_id),
        None,
        Some(nama),
        &format!("Penambahan Kelompok Ibadah Baru: {} ({})", nama, nomor),
        None,
        None,
    );

    Ok(KelompokListItem {
        id: new_id,
        nomor_kelompok: nomor.to_string(),
        nama_kelompok: nama.to_string(),
        deskripsi: deskripsi_clean,
        is_active: true,
        jumlah_jemaat: 0,
    })
}

#[tauri::command]
pub fn update_kelompok(
    state: State<DbState>,
    token: String,
    input: UpdateKelompokInput,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mengubah kelompok ibadah".to_string());
    }

    let nomor = input.nomor_kelompok.trim();
    let nama = input.nama_kelompok.trim();

    if nomor.is_empty() {
        return Err("Nomor kelompok wajib diisi".to_string());
    }
    if nama.is_empty() {
        return Err("Nama kelompok wajib diisi".to_string());
    }

    // Cek duplikasi nomor kelompok dengan id lain
    let existing_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM kelompok WHERE nomor_kelompok = ?1 AND id != ?2",
            rusqlite::params![nomor, input.id],
            |r| r.get(0),
        )
        .unwrap_or(0);

    if existing_count > 0 {
        return Err(format!("Nomor kelompok '{}' sudah digunakan oleh kelompok lain.", nomor));
    }

    let now = Utc::now().to_rfc3339();
    let deskripsi_clean = input.deskripsi.as_ref().map(|d| d.trim().to_string()).filter(|d| !d.is_empty());
    let is_active_int = if input.is_active { 1 } else { 0 };

    conn.execute(
        "UPDATE kelompok SET nomor_kelompok = ?1, nama_kelompok = ?2, deskripsi = ?3, is_active = ?4, updated_at = ?5
         WHERE id = ?6",
        rusqlite::params![
            nomor,
            nama,
            deskripsi_clean,
            is_active_int,
            now,
            input.id
        ],
    )
    .map_err(|e| format!("Gagal memperbarui kelompok ibadah: {}", e))?;

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "UPDATE",
        "kelompok",
        Some(&input.id),
        None,
        Some(nama),
        &format!("Pembaruan Kelompok Ibadah: {} ({})", nama, nomor),
        None,
        None,
    );

    Ok(())
}

#[tauri::command]
pub fn delete_kelompok(
    state: State<DbState>,
    token: String,
    id: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak menghapus kelompok ibadah".to_string());
    }

    // Ambil info kelompok
    let (nama_kelompok, nomor_kelompok): (String, String) = conn
        .query_row(
            "SELECT nama_kelompok, nomor_kelompok FROM kelompok WHERE id = ?1",
            [&id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|_| "Kelompok ibadah tidak ditemukan".to_string())?;

    // Validasi apakah masih ada jemaat aktif
    let jemaat_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM jemaat WHERE kelompok_id = ?1 AND is_archived = 0",
            [&id],
            |r| r.get(0),
        )
        .unwrap_or(0);

    if jemaat_count > 0 {
        return Err(format!(
            "Kelompok '{}' ({}) tidak dapat dihapus karena masih menaungi {} jemaat aktif. Silakan pindahkan anggota kelompok terlebih dahulu atau ubah status menjadi non-aktif.",
            nama_kelompok, nomor_kelompok, jemaat_count
        ));
    }

    conn.execute("DELETE FROM kelompok WHERE id = ?1", [&id])
        .map_err(|e| format!("Gagal menghapus kelompok ibadah: {}", e))?;

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "DELETE",
        "kelompok",
        Some(&id),
        Some(&nama_kelompok),
        None,
        &format!("Penghapusan Kelompok Ibadah: {} ({})", nama_kelompok, nomor_kelompok),
        None,
        None,
    );

    Ok(())
}

