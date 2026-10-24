use crate::audit::log_audit;
use crate::auth::Role;
use crate::commands::auth_cmd::verify_session;
use crate::db::DbState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeristiwaGerejawiItem {
    pub id: String,
    pub jemaat_id: String,
    pub nomor_anggota: String,
    pub nama_lengkap: String,
    pub jenis_kelamin: String,
    pub jenis_peristiwa: String,
    pub tanggal_peristiwa: String,
    pub tempat: Option<String>,
    pub pelayan_firman: Option<String>,
    pub nomor_surat: Option<String>,
    pub keterangan: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePeristiwaInput {
    pub jemaat_id: String,
    pub jenis_peristiwa: String,
    pub tanggal_peristiwa: String,
    pub tempat: Option<String>,
    pub pelayan_firman: Option<String>,
    pub nomor_surat: Option<String>,
    pub keterangan: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePerkawinanInput {
    pub mempelai_1_id: String,
    pub mempelai_2_id: Option<String>,
    pub nama_pasangan_luar: Option<String>,
    pub tanggal_perkawinan: String,
    pub tempat: Option<String>,
    pub pelayan_firman: Option<String>,
    pub nomor_surat: Option<String>,
    pub keterangan: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AtestasiItem {
    pub id: String,
    pub jemaat_id: String,
    pub nomor_anggota: String,
    pub nama_lengkap: String,
    pub jenis_kelamin: String,
    pub status_sebelumnya: String,
    pub status_baru: String,
    pub tanggal_perubahan: String,
    pub alasan: Option<String>,
    pub jemaat_tujuan_asal: Option<String>,
    pub nomor_surat: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAtestasiKeluarInput {
    pub jemaat_id: String,
    pub gereja_tujuan: String,
    pub tanggal_keluar: String,
    pub nomor_surat: Option<String>,
    pub alasan: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAtestasiMasukInput {
    pub jemaat_id: String,
    pub gereja_asal: String,
    pub tanggal_masuk: String,
    pub nomor_surat: Option<String>,
    pub keterangan: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KematianItem {
    pub id: String,
    pub jemaat_id: String,
    pub nomor_anggota: String,
    pub nama_lengkap: String,
    pub jenis_kelamin: String,
    pub tanggal_lahir: String,
    pub tanggal_meninggal: String,
    pub tempat_meninggal: Option<String>,
    pub tempat_pemakaman: Option<String>,
    pub pelayan_pemakaman: Option<String>,
    pub nomor_surat_kematian: Option<String>,
    pub keterangan: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatatKematianInput {
    pub jemaat_id: String,
    pub tanggal_meninggal: String,
    pub tempat_meninggal: Option<String>,
    pub tempat_pemakaman: Option<String>,
    pub pelayan_pemakaman: Option<String>,
    pub nomor_surat_kematian: Option<String>,
    pub keterangan: Option<String>,
}

#[tauri::command]
pub fn list_peristiwa_gerejawi(
    state: State<DbState>,
    token: String,
    jenis_peristiwa: Option<String>,
    search: Option<String>,
) -> Result<Vec<PeristiwaGerejawiItem>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = verify_session(&conn, &token)?;

    let mut conditions = Vec::new();
    let mut params = Vec::new();

    if let Some(jp) = &jenis_peristiwa {
        if !jp.trim().is_empty() {
            conditions.push("rg.jenis_peristiwa = ?".to_string());
            params.push(rusqlite::types::Value::Text(jp.trim().to_string()));
        }
    }

    if let Some(q) = &search {
        let q_clean = q.trim();
        if !q_clean.is_empty() {
            conditions.push("(j.nama_lengkap LIKE ? OR j.nomor_anggota LIKE ? OR rg.nomor_surat LIKE ? OR rg.pelayan_firman LIKE ?)".to_string());
            let pattern = format!("%{}%", q_clean);
            params.push(rusqlite::types::Value::Text(pattern.clone()));
            params.push(rusqlite::types::Value::Text(pattern.clone()));
            params.push(rusqlite::types::Value::Text(pattern.clone()));
            params.push(rusqlite::types::Value::Text(pattern));
        }
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT rg.id, rg.jemaat_id, j.nomor_anggota, j.nama_lengkap, j.jenis_kelamin,
                rg.jenis_peristiwa, rg.tanggal_peristiwa, rg.tempat, rg.pelayan_firman,
                rg.nomor_surat, rg.keterangan, rg.created_at
         FROM riwayat_gerejawi rg
         JOIN jemaat j ON rg.jemaat_id = j.id
         {}
         ORDER BY rg.tanggal_peristiwa DESC, rg.created_at DESC",
        where_clause
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |r| {
            Ok(PeristiwaGerejawiItem {
                id: r.get(0)?,
                jemaat_id: r.get(1)?,
                nomor_anggota: r.get(2)?,
                nama_lengkap: r.get(3)?,
                jenis_kelamin: r.get(4)?,
                jenis_peristiwa: r.get(5)?,
                tanggal_peristiwa: r.get(6)?,
                tempat: r.get(7)?,
                pelayan_firman: r.get(8)?,
                nomor_surat: r.get(9)?,
                keterangan: r.get(10)?,
                created_at: r.get(11)?,
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
pub fn create_peristiwa_gerejawi(
    state: State<DbState>,
    token: String,
    input: CreatePeristiwaInput,
) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mencatat peristiwa gerejawi".to_string());
    }

    if input.tanggal_peristiwa.trim().is_empty() {
        return Err("Tanggal peristiwa wajib diisi".to_string());
    }

    let valid_jenis = ["BAPTIS", "SIDI", "PERKAWINAN", "PENGAKUAN_DOSA", "LAINNYA"];
    if !valid_jenis.contains(&input.jenis_peristiwa.trim()) {
        return Err("Jenis peristiwa gerejawi tidak valid".to_string());
    }

    // Ambil info jemaat
    let nama_jemaat: String = conn
        .query_row(
            "SELECT nama_lengkap FROM jemaat WHERE id = ?1",
            [&input.jemaat_id],
            |r| r.get(0),
        )
        .map_err(|_| "Data jemaat tidak ditemukan".to_string())?;

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO riwayat_gerejawi (
            id, jemaat_id, jenis_peristiwa, tanggal_peristiwa, tempat,
            pelayan_firman, nomor_surat, keterangan, recorded_by, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            id,
            input.jemaat_id,
            input.jenis_peristiwa.trim(),
            input.tanggal_peristiwa.trim(),
            input.tempat.as_ref().map(|t| t.trim().to_string()),
            input.pelayan_firman.as_ref().map(|p| p.trim().to_string()),
            input.nomor_surat.as_ref().map(|n| n.trim().to_string()),
            input.keterangan.as_ref().map(|k| k.trim().to_string()),
            current_user.id,
            now
        ],
    )
    .map_err(|e| format!("Gagal mencatat peristiwa gerejawi: {}", e))?;

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "CREATE",
        "riwayat_gerejawi",
        Some(&id),
        None,
        Some(&format!("{{\"jemaat\": \"{}\", \"jenis\": \"{}\", \"tanggal\": \"{}\"}}", nama_jemaat, input.jenis_peristiwa.trim(), input.tanggal_peristiwa.trim())),
        &format!("Pencatatan {} untuk jemaat: {}", input.jenis_peristiwa.trim(), nama_jemaat),
        input.keterangan.as_deref(),
        None,
    );

    Ok(id)
}

#[tauri::command]
pub fn create_perkawinan_gerejawi(
    state: State<DbState>,
    token: String,
    input: CreatePerkawinanInput,
) -> Result<String, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mencatat perkawinan gerejawi".to_string());
    }

    if input.tanggal_perkawinan.trim().is_empty() {
        return Err("Tanggal perkawinan kudus wajib diisi".to_string());
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Ambil data mempelai 1
    let nama_mempelai_1: String = tx
        .query_row(
            "SELECT nama_lengkap FROM jemaat WHERE id = ?1",
            [&input.mempelai_1_id],
            |r| r.get(0),
        )
        .map_err(|_| "Data jemaat mempelai 1 tidak ditemukan".to_string())?;

    let mut nama_mempelai_2_opt = input.nama_pasangan_luar.clone();

    if let Some(m2_id) = &input.mempelai_2_id {
        if !m2_id.trim().is_empty() {
            let m2_nama: String = tx
                .query_row(
                    "SELECT nama_lengkap FROM jemaat WHERE id = ?1",
                    [m2_id],
                    |r| r.get(0),
                )
                .map_err(|_| "Data jemaat mempelai 2 tidak ditemukan".to_string())?;
            nama_mempelai_2_opt = Some(m2_nama);
        }
    }

    let nama_pasangan_display = nama_mempelai_2_opt.unwrap_or_else(|| "Pasangan".to_string());

    let now = Utc::now().to_rfc3339();
    let id_1 = Uuid::new_v4().to_string();

    let ket_1 = match &input.keterangan {
        Some(k) if !k.trim().is_empty() => format!("Menikah dengan {}. Catatan: {}", nama_pasangan_display, k.trim()),
        _ => format!("Menikah dengan {}", nama_pasangan_display),
    };

    // 1. Catat riwayat_gerejawi untuk Mempelai 1
    tx.execute(
        "INSERT INTO riwayat_gerejawi (
            id, jemaat_id, jenis_peristiwa, tanggal_peristiwa, tempat,
            pelayan_firman, nomor_surat, keterangan, recorded_by, created_at
        ) VALUES (?1, ?2, 'PERKAWINAN', ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![
            id_1,
            input.mempelai_1_id,
            input.tanggal_perkawinan.trim(),
            input.tempat.as_ref().map(|t| t.trim().to_string()),
            input.pelayan_firman.as_ref().map(|p| p.trim().to_string()),
            input.nomor_surat.as_ref().map(|n| n.trim().to_string()),
            ket_1,
            current_user.id,
            now
        ],
    )
    .map_err(|e| format!("Gagal mencatat pernikahan mempelai 1: {}", e))?;

    // Update status jemaat 1 -> MENIKAH
    tx.execute(
        "UPDATE jemaat SET status_perkawinan = 'MENIKAH', tanggal_menikah = ?1, updated_at = ?2, updated_by = ?3 WHERE id = ?4",
        rusqlite::params![input.tanggal_perkawinan.trim(), now, current_user.id, input.mempelai_1_id],
    )
    .map_err(|e| format!("Gagal memperbarui status jemaat mempelai 1: {}", e))?;

    // 2. Jika Mempelai 2 juga jemaat internal Maranatha, catat dan update juga
    if let Some(m2_id) = &input.mempelai_2_id {
        if !m2_id.trim().is_empty() && m2_id != &input.mempelai_1_id {
            let id_2 = Uuid::new_v4().to_string();
            let ket_2 = match &input.keterangan {
                Some(k) if !k.trim().is_empty() => format!("Menikah dengan {}. Catatan: {}", nama_mempelai_1, k.trim()),
                _ => format!("Menikah dengan {}", nama_mempelai_1),
            };

            tx.execute(
                "INSERT INTO riwayat_gerejawi (
                    id, jemaat_id, jenis_peristiwa, tanggal_peristiwa, tempat,
                    pelayan_firman, nomor_surat, keterangan, recorded_by, created_at
                ) VALUES (?1, ?2, 'PERKAWINAN', ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                rusqlite::params![
                    id_2,
                    m2_id,
                    input.tanggal_perkawinan.trim(),
                    input.tempat.as_ref().map(|t| t.trim().to_string()),
                    input.pelayan_firman.as_ref().map(|p| p.trim().to_string()),
                    input.nomor_surat.as_ref().map(|n| n.trim().to_string()),
                    ket_2,
                    current_user.id,
                    now
                ],
            )
            .map_err(|e| format!("Gagal mencatat pernikahan mempelai 2: {}", e))?;

            tx.execute(
                "UPDATE jemaat SET status_perkawinan = 'MENIKAH', tanggal_menikah = ?1, updated_at = ?2, updated_by = ?3 WHERE id = ?4",
                rusqlite::params![input.tanggal_perkawinan.trim(), now, current_user.id, m2_id],
            )
            .map_err(|e| format!("Gagal memperbarui status jemaat mempelai 2: {}", e))?;
        }
    }

    let _ = log_audit(
        &tx,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "CREATE",
        "riwayat_gerejawi",
        Some(&id_1),
        None,
        Some(&format!("{{\"mempelai_1\": \"{}\", \"mempelai_2\": \"{}\", \"tanggal\": \"{}\"}}", nama_mempelai_1, nama_pasangan_display, input.tanggal_perkawinan.trim())),
        &format!("Pencatatan Pernikahan Kudus: {} & {}", nama_mempelai_1, nama_pasangan_display),
        input.keterangan.as_deref(),
        None,
    );

    tx.commit().map_err(|e| e.to_string())?;

    Ok(id_1)
}

#[tauri::command]
pub fn list_atestasi(
    state: State<DbState>,
    token: String,
    search: Option<String>,
) -> Result<Vec<AtestasiItem>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = verify_session(&conn, &token)?;

    let mut conditions = Vec::new();
    let mut params = Vec::new();

    if let Some(q) = &search {
        let q_clean = q.trim();
        if !q_clean.is_empty() {
            conditions.push("(j.nama_lengkap LIKE ? OR j.nomor_anggota LIKE ? OR rk.nomor_surat LIKE ? OR rk.jemaat_tujuan_asal LIKE ?)".to_string());
            let pattern = format!("%{}%", q_clean);
            params.push(rusqlite::types::Value::Text(pattern.clone()));
            params.push(rusqlite::types::Value::Text(pattern.clone()));
            params.push(rusqlite::types::Value::Text(pattern.clone()));
            params.push(rusqlite::types::Value::Text(pattern));
        }
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT rk.id, rk.jemaat_id, j.nomor_anggota, j.nama_lengkap, j.jenis_kelamin,
                rk.status_sebelumnya, rk.status_baru, rk.tanggal_perubahan,
                rk.alasan, rk.jemaat_tujuan_asal, rk.nomor_surat, rk.created_at
         FROM riwayat_keanggotaan rk
         JOIN jemaat j ON rk.jemaat_id = j.id
         {}
         ORDER BY rk.tanggal_perubahan DESC, rk.created_at DESC",
        where_clause
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |r| {
            Ok(AtestasiItem {
                id: r.get(0)?,
                jemaat_id: r.get(1)?,
                nomor_anggota: r.get(2)?,
                nama_lengkap: r.get(3)?,
                jenis_kelamin: r.get(4)?,
                status_sebelumnya: r.get(5)?,
                status_baru: r.get(6)?,
                tanggal_perubahan: r.get(7)?,
                alasan: r.get(8)?,
                jemaat_tujuan_asal: r.get(9)?,
                nomor_surat: r.get(10)?,
                created_at: r.get(11)?,
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
pub fn create_atestasi_keluar(
    state: State<DbState>,
    token: String,
    input: CreateAtestasiKeluarInput,
) -> Result<String, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mencatat atestasi keluar".to_string());
    }

    if input.gereja_tujuan.trim().is_empty() {
        return Err("Nama jemaat / gereja tujuan wajib diisi".to_string());
    }
    if input.tanggal_keluar.trim().is_empty() {
        return Err("Tanggal atestasi keluar wajib diisi".to_string());
    }
    if input.alasan.trim().is_empty() {
        return Err("Alasan pindah keanggotaan wajib diisi".to_string());
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Ambil info jemaat & status saat ini
    let (nama_jemaat, status_lama): (String, String) = tx
        .query_row(
            "SELECT nama_lengkap, status_keanggotaan FROM jemaat WHERE id = ?1",
            [&input.jemaat_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|_| "Data jemaat tidak ditemukan".to_string())?;

    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    // 1. Catat ke riwayat_keanggotaan
    tx.execute(
        "INSERT INTO riwayat_keanggotaan (
            id, jemaat_id, status_sebelumnya, status_baru, tanggal_perubahan,
            alasan, jemaat_tujuan_asal, nomor_surat, recorded_by, created_at
        ) VALUES (?1, ?2, ?3, 'PINDAH', ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![
            id,
            input.jemaat_id,
            status_lama,
            input.tanggal_keluar.trim(),
            input.alasan.trim(),
            input.gereja_tujuan.trim(),
            input.nomor_surat.as_ref().map(|n| n.trim().to_string()),
            current_user.id,
            now
        ],
    )
    .map_err(|e| format!("Gagal mencatat riwayat atestasi: {}", e))?;

    // 2. Update status_keanggotaan jemaat menjadi PINDAH
    tx.execute(
        "UPDATE jemaat SET status_keanggotaan = 'PINDAH', updated_at = ?1, updated_by = ?2 WHERE id = ?3",
        rusqlite::params![now, current_user.id, input.jemaat_id],
    )
    .map_err(|e| format!("Gagal memperbarui status keanggotaan jemaat: {}", e))?;

    // 3. Selesaikan jabatan aktif jika ada
    let _ = tx.execute(
        "UPDATE riwayat_jabatan SET
            tanggal_berakhir = ?1,
            keterangan = COALESCE(keterangan || ' | Selesai karena Pindah Jemaat', 'Selesai karena Pindah Jemaat')
         WHERE jemaat_id = ?2 AND (tanggal_berakhir IS NULL OR tanggal_berakhir >= ?1)",
        rusqlite::params![input.tanggal_keluar.trim(), input.jemaat_id],
    );

    let _ = log_audit(
        &tx,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "UPDATE",
        "jemaat",
        Some(&input.jemaat_id),
        Some(&status_lama),
        Some("PINDAH"),
        &format!("Atestasi Keluar: {} pindah ke {}", nama_jemaat, input.gereja_tujuan.trim()),
        Some(input.alasan.trim()),
        None,
    );

    tx.commit().map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub fn create_atestasi_masuk(
    state: State<DbState>,
    token: String,
    input: CreateAtestasiMasukInput,
) -> Result<String, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mencatat atestasi masuk".to_string());
    }

    if input.gereja_asal.trim().is_empty() {
        return Err("Nama gereja asal wajib diisi".to_string());
    }
    if input.tanggal_masuk.trim().is_empty() {
        return Err("Tanggal atestasi masuk wajib diisi".to_string());
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let (nama_jemaat, status_lama): (String, String) = tx
        .query_row(
            "SELECT nama_lengkap, status_keanggotaan FROM jemaat WHERE id = ?1",
            [&input.jemaat_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|_| "Data jemaat tidak ditemukan".to_string())?;

    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    tx.execute(
        "INSERT INTO riwayat_keanggotaan (
            id, jemaat_id, status_sebelumnya, status_baru, tanggal_perubahan,
            alasan, jemaat_tujuan_asal, nomor_surat, recorded_by, created_at
        ) VALUES (?1, ?2, ?3, 'AKTIF', ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![
            id,
            input.jemaat_id,
            status_lama,
            input.tanggal_masuk.trim(),
            input.keterangan.as_ref().map(|k| k.trim().to_string()),
            input.gereja_asal.trim(),
            input.nomor_surat.as_ref().map(|n| n.trim().to_string()),
            current_user.id,
            now
        ],
    )
    .map_err(|e| format!("Gagal mencatat atestasi masuk: {}", e))?;

    tx.execute(
        "UPDATE jemaat SET status_keanggotaan = 'AKTIF', tanggal_masuk = ?1, updated_at = ?2, updated_by = ?3 WHERE id = ?4",
        rusqlite::params![input.tanggal_masuk.trim(), now, current_user.id, input.jemaat_id],
    )
    .map_err(|e| format!("Gagal memperbarui status keanggotaan jemaat: {}", e))?;

    let _ = log_audit(
        &tx,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "UPDATE",
        "jemaat",
        Some(&input.jemaat_id),
        Some(&status_lama),
        Some("AKTIF"),
        &format!("Atestasi Masuk: {} diterima dari {}", nama_jemaat, input.gereja_asal.trim()),
        input.keterangan.as_deref(),
        None,
    );

    tx.commit().map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub fn list_kematian(
    state: State<DbState>,
    token: String,
    search: Option<String>,
) -> Result<Vec<KematianItem>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = verify_session(&conn, &token)?;

    let mut conditions = Vec::new();
    let mut params = Vec::new();

    if let Some(q) = &search {
        let q_clean = q.trim();
        if !q_clean.is_empty() {
            conditions.push("(j.nama_lengkap LIKE ? OR j.nomor_anggota LIKE ? OR am.tempat_pemakaman LIKE ? OR am.nomor_surat_kematian LIKE ?)".to_string());
            let pattern = format!("%{}%", q_clean);
            params.push(rusqlite::types::Value::Text(pattern.clone()));
            params.push(rusqlite::types::Value::Text(pattern.clone()));
            params.push(rusqlite::types::Value::Text(pattern.clone()));
            params.push(rusqlite::types::Value::Text(pattern));
        }
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let sql = format!(
        "SELECT am.id, am.jemaat_id, j.nomor_anggota, j.nama_lengkap, j.jenis_kelamin,
                j.tanggal_lahir, am.tanggal_meninggal, am.tempat_meninggal,
                am.tempat_pemakaman, am.pelayan_pemakaman, am.nomor_surat_kematian,
                am.keterangan, am.created_at
         FROM arsip_meninggal am
         JOIN jemaat j ON am.jemaat_id = j.id
         {}
         ORDER BY am.tanggal_meninggal DESC, am.created_at DESC",
        where_clause
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |r| {
            Ok(KematianItem {
                id: r.get(0)?,
                jemaat_id: r.get(1)?,
                nomor_anggota: r.get(2)?,
                nama_lengkap: r.get(3)?,
                jenis_kelamin: r.get(4)?,
                tanggal_lahir: r.get(5)?,
                tanggal_meninggal: r.get(6)?,
                tempat_meninggal: r.get(7)?,
                tempat_pemakaman: r.get(8)?,
                pelayan_pemakaman: r.get(9)?,
                nomor_surat_kematian: r.get(10)?,
                keterangan: r.get(11)?,
                created_at: r.get(12)?,
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
pub fn catat_kematian(
    state: State<DbState>,
    token: String,
    input: CatatKematianInput,
) -> Result<String, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mencatat kematian jemaat".to_string());
    }

    if input.tanggal_meninggal.trim().is_empty() {
        return Err("Tanggal meninggal dunia wajib diisi".to_string());
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Ambil info jemaat
    let (nama_jemaat, status_lama): (String, String) = tx
        .query_row(
            "SELECT nama_lengkap, status_keanggotaan FROM jemaat WHERE id = ?1",
            [&input.jemaat_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|_| "Data jemaat tidak ditemukan".to_string())?;

    let now = Utc::now().to_rfc3339();
    let id = Uuid::new_v4().to_string();

    // 1. Masukkan ke arsip_meninggal
    tx.execute(
        "INSERT INTO arsip_meninggal (
            id, jemaat_id, tanggal_meninggal, tempat_meninggal, tempat_pemakaman,
            pelayan_pemakaman, nomor_surat_kematian, keterangan, archived_by, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            id,
            input.jemaat_id,
            input.tanggal_meninggal.trim(),
            input.tempat_meninggal.as_ref().map(|t| t.trim().to_string()),
            input.tempat_pemakaman.as_ref().map(|t| t.trim().to_string()),
            input.pelayan_pemakaman.as_ref().map(|p| p.trim().to_string()),
            input.nomor_surat_kematian.as_ref().map(|n| n.trim().to_string()),
            input.keterangan.as_ref().map(|k| k.trim().to_string()),
            current_user.id,
            now
        ],
    )
    .map_err(|e| format!("Gagal mencatat data kematian: {}", e))?;

    // 2. Catat ke riwayat_keanggotaan
    let id_rk = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO riwayat_keanggotaan (
            id, jemaat_id, status_sebelumnya, status_baru, tanggal_perubahan,
            alasan, recorded_by, created_at
        ) VALUES (?1, ?2, ?3, 'MENINGGAL', ?4, 'Meninggal Dunia', ?5, ?6)",
        rusqlite::params![
            id_rk,
            input.jemaat_id,
            status_lama,
            input.tanggal_meninggal.trim(),
            current_user.id,
            now
        ],
    )
    .map_err(|e| format!("Gagal mencatat riwayat keanggotaan: {}", e))?;

    // 3. Update status jemaat menjadi MENINGGAL dan is_archived = 1
    tx.execute(
        "UPDATE jemaat SET status_keanggotaan = 'MENINGGAL', tanggal_meninggal = ?1, is_archived = 1, updated_at = ?2, updated_by = ?3 WHERE id = ?4",
        rusqlite::params![input.tanggal_meninggal.trim(), now, current_user.id, input.jemaat_id],
    )
    .map_err(|e| format!("Gagal memperbarui status jemaat: {}", e))?;

    // 4. Selesaikan jabatan pelayanan aktif
    let _ = tx.execute(
        "UPDATE riwayat_jabatan SET
            tanggal_berakhir = ?1,
            keterangan = COALESCE(keterangan || ' | Selesai karena Meninggal Dunia', 'Selesai karena Meninggal Dunia')
         WHERE jemaat_id = ?2 AND (tanggal_berakhir IS NULL OR tanggal_berakhir >= ?1)",
        rusqlite::params![input.tanggal_meninggal.trim(), input.jemaat_id],
    );

    // 5. Sesuaikan susunan Kartu Keluarga (jika ada)
    let _ = tx.execute(
        "UPDATE anggota_keluarga SET
            tanggal_berakhir = ?1,
            catatan = COALESCE(catatan || ' | Meninggal Dunia', 'Meninggal Dunia')
         WHERE jemaat_id = ?2 AND tanggal_berakhir IS NULL",
        rusqlite::params![input.tanggal_meninggal.trim(), input.jemaat_id],
    );

    // Jika menjabat kepala keluarga, kosongkan kepala_keluarga_id
    let _ = tx.execute(
        "UPDATE keluarga SET kepala_keluarga_id = NULL WHERE kepala_keluarga_id = ?1",
        [&input.jemaat_id],
    );

    let _ = log_audit(
        &tx,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "ARCHIVE",
        "jemaat",
        Some(&input.jemaat_id),
        Some(&status_lama),
        Some("MENINGGAL"),
        &format!("Pencatatan Kematian: {} meninggal pada {}", nama_jemaat, input.tanggal_meninggal.trim()),
        input.keterangan.as_deref(),
        None,
    );

    tx.commit().map_err(|e| e.to_string())?;

    Ok(id)
}
