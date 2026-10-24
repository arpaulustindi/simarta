use crate::audit::log_audit;
use crate::auth::Role;
use crate::commands::auth_cmd::verify_session;
use crate::db::DbState;
use chrono::Utc;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeluargaListItem {
    pub id: String,
    pub nomor_keluarga: String,
    pub nama_keluarga: String,
    pub kepala_keluarga_id: Option<String>,
    pub kepala_keluarga_nama: Option<String>,
    pub jumlah_anggota: usize,
    pub status: String,
    pub alamat: Option<String>,
    pub tanggal_pembentukan: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeluargaFilter {
    pub search: Option<String>,
    pub status: Option<String>,
    pub page: Option<usize>,
    pub page_size: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeluargaPaginationResult {
    pub items: Vec<KeluargaListItem>,
    pub total: usize,
    pub page: usize,
    pub page_size: usize,
    pub total_pages: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnggotaKeluargaItem {
    pub id: String,
    pub keluarga_id: String,
    pub jemaat_id: String,
    pub nomor_anggota: String,
    pub nama_lengkap: String,
    pub jenis_kelamin: String,
    pub tanggal_lahir: String,
    pub status_perkawinan: String,
    pub hubungan_keluarga: String,
    pub nama_pelka: Option<String>,
    pub nama_kelompok: Option<String>,
    pub tanggal_mulai: String,
    pub tanggal_berakhir: Option<String>,
    pub catatan: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeluargaDetail {
    pub id: String,
    pub nomor_keluarga: String,
    pub nama_keluarga: String,
    pub kepala_keluarga_id: Option<String>,
    pub kepala_keluarga_nama: Option<String>,
    pub tanggal_pembentukan: Option<String>,
    pub status: String,
    pub alamat: Option<String>,
    pub catatan: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub anggota: Vec<AnggotaKeluargaItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeluargaInput {
    pub nomor_keluarga: Option<String>,
    pub nama_keluarga: String,
    pub kepala_keluarga_id: Option<String>,
    pub alamat: Option<String>,
    pub catatan: Option<String>,
    pub tanggal_pembentukan: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddAnggotaInput {
    pub keluarga_id: String,
    pub jemaat_id: String,
    pub hubungan_keluarga: String,
    pub tanggal_mulai: Option<String>,
    pub catatan: Option<String>,
}

fn generate_nomor_keluarga(conn: &Connection) -> Result<String, String> {
    let year = Utc::now().format("%Y").to_string();
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM keluarga", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    Ok(format!("KK-{}-{:04}", year, count + 1))
}

#[tauri::command]
pub fn list_keluarga(
    state: State<DbState>,
    token: String,
    filter: KeluargaFilter,
) -> Result<KeluargaPaginationResult, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = verify_session(&conn, &token)?;

    let page = filter.page.unwrap_or(1).max(1);
    let page_size = filter.page_size.unwrap_or(15).max(1);
    let offset = (page - 1) * page_size;

    let mut conditions = Vec::new();
    let mut params = Vec::<rusqlite::types::Value>::new();

    if let Some(search) = &filter.search {
        let s = search.trim();
        if !s.is_empty() {
            conditions.push("(LOWER(k.nama_keluarga) LIKE ? OR k.nomor_keluarga LIKE ? OR LOWER(j.nama_lengkap) LIKE ?)".to_string());
            let pattern = format!("%{}%", s.to_lowercase());
            params.push(rusqlite::types::Value::Text(pattern.clone()));
            params.push(rusqlite::types::Value::Text(pattern.clone()));
            params.push(rusqlite::types::Value::Text(pattern));
        }
    }

    if let Some(status) = &filter.status {
        let st = status.trim();
        if !st.is_empty() {
            conditions.push("k.status = ?".to_string());
            params.push(rusqlite::types::Value::Text(st.to_string()));
        }
    }

    let where_clause = if conditions.is_empty() {
        "".to_string()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let count_sql = format!(
        "SELECT COUNT(DISTINCT k.id)
         FROM keluarga k
         LEFT JOIN jemaat j ON k.kepala_keluarga_id = j.id
         {}",
        where_clause
    );
    let mut count_stmt = conn.prepare(&count_sql).map_err(|e| e.to_string())?;
    let total: usize = count_stmt
        .query_row(rusqlite::params_from_iter(params.iter()), |r| r.get(0))
        .map_err(|e| e.to_string())?;

    let select_sql = format!(
        "SELECT k.id, k.nomor_keluarga, k.nama_keluarga, k.kepala_keluarga_id, j.nama_lengkap,
                k.status, k.alamat, k.tanggal_pembentukan,
                (SELECT COUNT(*) FROM anggota_keluarga ak WHERE ak.keluarga_id = k.id) as jml_anggota
         FROM keluarga k
         LEFT JOIN jemaat j ON k.kepala_keluarga_id = j.id
         {}
         ORDER BY k.nama_keluarga ASC
         LIMIT ? OFFSET ?",
        where_clause
    );

    let mut select_params = params;
    select_params.push(rusqlite::types::Value::Integer(page_size as i64));
    select_params.push(rusqlite::types::Value::Integer(offset as i64));

    let mut stmt = conn.prepare(&select_sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(select_params.iter()), |r| {
            let jml: i64 = r.get(8)?;
            Ok(KeluargaListItem {
                id: r.get(0)?,
                nomor_keluarga: r.get(1)?,
                nama_keluarga: r.get(2)?,
                kepala_keluarga_id: r.get(3)?,
                kepala_keluarga_nama: r.get(4)?,
                status: r.get(5)?,
                alamat: r.get(6)?,
                tanggal_pembentukan: r.get(7)?,
                jumlah_anggota: jml as usize,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }

    let total_pages = if total == 0 { 1 } else { (total + page_size - 1) / page_size };

    Ok(KeluargaPaginationResult {
        items,
        total,
        page,
        page_size,
        total_pages,
    })
}

#[tauri::command]
pub fn get_keluarga_detail(
    state: State<DbState>,
    token: String,
    id: String,
) -> Result<KeluargaDetail, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = verify_session(&conn, &token)?;

    let mut stmt = conn
        .prepare(
            "SELECT k.id, k.nomor_keluarga, k.nama_keluarga, k.kepala_keluarga_id, j.nama_lengkap,
                    k.tanggal_pembentukan, k.status, k.alamat, k.catatan, k.created_at, k.updated_at
             FROM keluarga k
             LEFT JOIN jemaat j ON k.kepala_keluarga_id = j.id
             WHERE k.id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let mut detail = stmt
        .query_row([&id], |r| {
            Ok(KeluargaDetail {
                id: r.get(0)?,
                nomor_keluarga: r.get(1)?,
                nama_keluarga: r.get(2)?,
                kepala_keluarga_id: r.get(3)?,
                kepala_keluarga_nama: r.get(4)?,
                tanggal_pembentukan: r.get(5)?,
                status: r.get(6)?,
                alamat: r.get(7)?,
                catatan: r.get(8)?,
                created_at: r.get(9)?,
                updated_at: r.get(10)?,
                anggota: Vec::new(),
            })
        })
        .map_err(|_| "Data keluarga tidak ditemukan".to_string())?;

    let mut member_stmt = conn
        .prepare(
            "SELECT ak.id, ak.keluarga_id, ak.jemaat_id, j.nomor_anggota, j.nama_lengkap,
                    j.jenis_kelamin, j.tanggal_lahir, j.status_perkawinan, ak.hubungan_keluarga,
                    p.nama_pelka, kl.nama_kelompok, ak.tanggal_mulai, ak.tanggal_berakhir, ak.catatan
             FROM anggota_keluarga ak
             JOIN jemaat j ON ak.jemaat_id = j.id
             LEFT JOIN pelka p ON j.pelka_id = p.id
             LEFT JOIN kelompok kl ON j.kelompok_id = kl.id
             WHERE ak.keluarga_id = ?1
             ORDER BY
                CASE ak.hubungan_keluarga
                    WHEN 'KEPALA_KELUARGA' THEN 1
                    WHEN 'SUAMI' THEN 2
                    WHEN 'ISTRI' THEN 3
                    WHEN 'ANAK' THEN 4
                    WHEN 'ORANG_TUA' THEN 5
                    WHEN 'MERTUA' THEN 6
                    ELSE 7
                END,
                j.tanggal_lahir ASC",
        )
        .map_err(|e| e.to_string())?;

    let member_rows = member_stmt
        .query_map([&id], |r| {
            Ok(AnggotaKeluargaItem {
                id: r.get(0)?,
                keluarga_id: r.get(1)?,
                jemaat_id: r.get(2)?,
                nomor_anggota: r.get(3)?,
                nama_lengkap: r.get(4)?,
                jenis_kelamin: r.get(5)?,
                tanggal_lahir: r.get(6)?,
                status_perkawinan: r.get(7)?,
                hubungan_keluarga: r.get(8)?,
                nama_pelka: r.get(9)?,
                nama_kelompok: r.get(10)?,
                tanggal_mulai: r.get(11)?,
                tanggal_berakhir: r.get(12)?,
                catatan: r.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?;

    for m in member_rows {
        if let Ok(item) = m {
            detail.anggota.push(item);
        }
    }

    Ok(detail)
}

#[tauri::command]
pub fn create_keluarga(
    state: State<DbState>,
    token: String,
    input: KeluargaInput,
) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if input.nama_keluarga.trim().is_empty() {
        return Err("Nama keluarga wajib diisi".to_string());
    }

    let nomor_keluarga = match input.nomor_keluarga {
        Some(no) if !no.trim().is_empty() => no.trim().to_string(),
        _ => generate_nomor_keluarga(&conn)?,
    };

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let status = input.status.unwrap_or_else(|| "AKTIF".to_string());

    conn.execute(
        "INSERT INTO keluarga (
            id, nomor_keluarga, nama_keluarga, kepala_keluarga_id,
            tanggal_pembentukan, status, alamat, catatan, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)",
        rusqlite::params![
            id,
            nomor_keluarga,
            input.nama_keluarga.trim(),
            input.kepala_keluarga_id,
            input.tanggal_pembentukan.as_ref().map(|t| t.trim().to_string()),
            status,
            input.alamat.map(|a| a.trim().to_string()),
            input.catatan.map(|c| c.trim().to_string()),
            now
        ],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "Nomor keluarga sudah terdaftar".to_string()
        } else {
            format!("Gagal membuat kartu keluarga: {}", e)
        }
    })?;

    if let Some(kk_id) = &input.kepala_keluarga_id {
        if !kk_id.trim().is_empty() {
            let ak_id = Uuid::new_v4().to_string();
            let tgl_mulai = input.tanggal_pembentukan.clone().unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string());
            let _ = conn.execute(
                "INSERT OR IGNORE INTO anggota_keluarga (
                    id, keluarga_id, jemaat_id, hubungan_keluarga, tanggal_mulai, catatan
                ) VALUES (?1, ?2, ?3, 'KEPALA_KELUARGA', ?4, 'Kepala Keluarga Otomatis')",
                rusqlite::params![ak_id, id, kk_id, tgl_mulai],
            );
        }
    }

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "CREATE",
        "keluarga",
        Some(&id),
        None,
        Some(&format!("{{\"nama\": \"{}\", \"nomor\": \"{}\"}}", input.nama_keluarga.trim(), nomor_keluarga)),
        &format!("Pembuatan Kartu Keluarga baru: {} ({})", input.nama_keluarga.trim(), nomor_keluarga),
        None,
        None,
    );

    Ok(id)
}

#[tauri::command]
pub fn update_keluarga(
    state: State<DbState>,
    token: String,
    id: String,
    input: KeluargaInput,
    reason: Option<String>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mengubah data kartu keluarga".to_string());
    }

    if input.nama_keluarga.trim().is_empty() {
        return Err("Nama keluarga wajib diisi".to_string());
    }

    let old_data: Option<String> = conn
        .query_row(
            "SELECT json_object(
                'nama_keluarga', nama_keluarga,
                'kepala_keluarga_id', kepala_keluarga_id,
                'status', status,
                'alamat', alamat
            ) FROM keluarga WHERE id = ?1",
            [&id],
            |r| r.get(0),
        )
        .ok();

    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE keluarga SET
            nama_keluarga = ?1,
            kepala_keluarga_id = ?2,
            tanggal_pembentukan = ?3,
            status = COALESCE(?4, status),
            alamat = ?5,
            catatan = ?6,
            updated_at = ?7
         WHERE id = ?8",
        rusqlite::params![
            input.nama_keluarga.trim(),
            input.kepala_keluarga_id,
            input.tanggal_pembentukan.as_ref().map(|t| t.trim().to_string()),
            input.status,
            input.alamat.map(|a| a.trim().to_string()),
            input.catatan.map(|c| c.trim().to_string()),
            now,
            id
        ],
    )
    .map_err(|e| format!("Gagal memperbarui data keluarga: {}", e))?;

    if let Some(kk_id) = &input.kepala_keluarga_id {
        if !kk_id.trim().is_empty() {
            let exists: bool = conn
                .query_row(
                    "SELECT COUNT(*) FROM anggota_keluarga WHERE keluarga_id = ?1 AND jemaat_id = ?2",
                    rusqlite::params![id, kk_id],
                    |r| r.get::<_, i64>(0),
                )
                .map(|c| c > 0)
                .unwrap_or(false);

            if !exists {
                let ak_id = Uuid::new_v4().to_string();
                let today = Utc::now().format("%Y-%m-%d").to_string();
                let _ = conn.execute(
                    "INSERT INTO anggota_keluarga (id, keluarga_id, jemaat_id, hubungan_keluarga, tanggal_mulai)
                     VALUES (?1, ?2, ?3, 'KEPALA_KELUARGA', ?4)",
                    rusqlite::params![ak_id, id, kk_id, today],
                );
            }
        }
    }

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "UPDATE",
        "keluarga",
        Some(&id),
        old_data.as_deref(),
        Some(&format!("{{\"nama\": \"{}\"}}", input.nama_keluarga.trim())),
        &format!("Pembaruan Kartu Keluarga: {}", input.nama_keluarga.trim()),
        reason.as_deref(),
        None,
    );

    Ok(())
}

#[tauri::command]
pub fn add_anggota_keluarga(
    state: State<DbState>,
    token: String,
    input: AddAnggotaInput,
) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak menambah anggota keluarga".to_string());
    }

    let valid_hubungan = [
        "KEPALA_KELUARGA",
        "SUAMI",
        "ISTRI",
        "ANAK",
        "ORANG_TUA",
        "MERTUA",
        "FAMILI_LAIN",
    ];
    if !valid_hubungan.contains(&input.hubungan_keluarga.trim()) {
        return Err("Hubungan keluarga tidak valid".to_string());
    }

    let existing_kk: Option<(String, String)> = conn
        .query_row(
            "SELECT k.nomor_keluarga, k.nama_keluarga
             FROM anggota_keluarga ak
             JOIN keluarga k ON ak.keluarga_id = k.id
             WHERE ak.jemaat_id = ?1 AND ak.keluarga_id != ?2
             LIMIT 1",
            rusqlite::params![input.jemaat_id, input.keluarga_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .ok();

    if let Some((no_kk, nama_kk)) = existing_kk {
        return Err(format!(
            "Jemaat ini sudah terdaftar pada Kartu Keluarga lain: {} ({})",
            nama_kk, no_kk
        ));
    }

    let id = Uuid::new_v4().to_string();
    let tgl_mulai = input
        .tanggal_mulai
        .unwrap_or_else(|| Utc::now().format("%Y-%m-%d").to_string());

    conn.execute(
        "INSERT INTO anggota_keluarga (
            id, keluarga_id, jemaat_id, hubungan_keluarga, tanggal_mulai, catatan
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            id,
            input.keluarga_id,
            input.jemaat_id,
            input.hubungan_keluarga.trim(),
            tgl_mulai,
            input.catatan.map(|c| c.trim().to_string())
        ],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            "Jemaat ini sudah terdaftar dalam Kartu Keluarga ini".to_string()
        } else {
            format!("Gagal menambahkan anggota keluarga: {}", e)
        }
    })?;

    if input.hubungan_keluarga.trim() == "KEPALA_KELUARGA" {
        let _ = conn.execute(
            "UPDATE keluarga SET kepala_keluarga_id = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![input.jemaat_id, Utc::now().to_rfc3339(), input.keluarga_id],
        );
    }

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "CREATE",
        "anggota_keluarga",
        Some(&id),
        None,
        Some(&format!("{{\"keluarga_id\": \"{}\", \"jemaat_id\": \"{}\"}}", input.keluarga_id, input.jemaat_id)),
        &format!("Menambahkan anggota keluarga baru (hubungan: {})", input.hubungan_keluarga.trim()),
        None,
        None,
    );

    Ok(id)
}

#[tauri::command]
pub fn remove_anggota_keluarga(
    state: State<DbState>,
    token: String,
    id: String,
    reason: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak menghapus anggota keluarga".to_string());
    }

    if reason.trim().is_empty() {
        return Err("Alasan penghapusan anggota keluarga wajib diisi".to_string());
    }

    let info: Option<(String, String, String)> = conn
        .query_row(
            "SELECT ak.keluarga_id, ak.jemaat_id, ak.hubungan_keluarga
             FROM anggota_keluarga ak WHERE ak.id = ?1",
            [&id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .ok();

    conn.execute("DELETE FROM anggota_keluarga WHERE id = ?1", [&id])
        .map_err(|e| format!("Gagal menghapus anggota keluarga: {}", e))?;

    if let Some((keluarga_id, jemaat_id, hubungan)) = &info {
        if hubungan == "KEPALA_KELUARGA" {
            let _ = conn.execute(
                "UPDATE keluarga SET kepala_keluarga_id = NULL, updated_at = ?1
                 WHERE id = ?2 AND kepala_keluarga_id = ?3",
                rusqlite::params![Utc::now().to_rfc3339(), keluarga_id, jemaat_id],
            );
        }
    }

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "DELETE",
        "anggota_keluarga",
        Some(&id),
        None,
        None,
        &format!("Menghapus anggota keluarga. Alasan: {}", reason.trim()),
        Some(reason.trim()),
        None,
    );

    Ok(())
}
