use crate::audit::log_audit;
use crate::auth::Role;
use crate::commands::auth_cmd::verify_session;
use crate::db::DbState;
use crate::pelka::{calculate_pelka_recommendation, PelkaRecommendation};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PelkaSummaryItem {
    pub id: String,
    pub kode: String,
    pub nama_pelka: String,
    pub deskripsi: Option<String>,
    pub is_active: bool,
    pub jumlah_anggota_aktual: usize,
    pub jumlah_rekomendasi: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PelkaReviewItem {
    pub jemaat_id: String,
    pub nomor_anggota: String,
    pub nama_lengkap: String,
    pub jenis_kelamin: String,
    pub tanggal_lahir: String,
    pub usia: u32,
    pub status_perkawinan: String,
    pub pelka_aktual_id: Option<String>,
    pub pelka_aktual_nama: Option<String>,
    pub pelka_aktual_kode: Option<String>,
    pub rekomendasi_kode: String,
    pub rekomendasi_nama: String,
    pub rekomendasi_id: Option<String>,
    pub alasan_rekomendasi: String,
    pub nama_kelompok: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PelkaMutationInput {
    pub jemaat_id: String,
    pub new_pelka_id: String,
    pub reason: String,
}

#[tauri::command]
pub fn get_pelka_recommendation(
    birth_date: String,
    gender: String,
    marital_status: String,
) -> PelkaRecommendation {
    calculate_pelka_recommendation(&birth_date, &gender, &marital_status, None)
}

#[tauri::command]
pub fn list_pelka_summary(
    state: State<DbState>,
    token: String,
) -> Result<Vec<PelkaSummaryItem>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = verify_session(&conn, &token)?;

    // 1. Get all pelka
    let mut stmt = conn
        .prepare("SELECT id, kode, nama_pelka, deskripsi, is_active FROM pelka ORDER BY kode ASC")
        .map_err(|e| e.to_string())?;

    let pelka_rows = stmt
        .query_map([], |r| {
            let is_active_int: i32 = r.get(4)?;
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, Option<String>>(3)?,
                is_active_int == 1,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut pelka_list = Vec::new();
    for p in pelka_rows {
        pelka_list.push(p.map_err(|e| e.to_string())?);
    }

    // 2. Fetch all active jemaat to count aktual and rekomendasi
    let mut jemaat_stmt = conn
        .prepare("SELECT pelka_id, tanggal_lahir, jenis_kelamin, status_perkawinan FROM jemaat WHERE is_archived = 0")
        .map_err(|e| e.to_string())?;

    let jemaat_rows = jemaat_stmt
        .query_map([], |r| {
            Ok((
                r.get::<_, Option<String>>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, String>(3)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    let mut all_jemaat = Vec::new();
    for j in jemaat_rows {
        all_jemaat.push(j.map_err(|e| e.to_string())?);
    }

    for (p_id, p_kode, p_nama, p_desk, p_active) in pelka_list {
        let aktual_count = all_jemaat
            .iter()
            .filter(|(j_pelka_id, _, _, _)| j_pelka_id.as_deref() == Some(&p_id))
            .count();

        let rekomendasi_count = all_jemaat
            .iter()
            .filter(|(_, tgl, jk, sp)| {
                let rec = calculate_pelka_recommendation(tgl, jk, sp, None);
                rec.kode == p_kode
            })
            .count();

        items.push(PelkaSummaryItem {
            id: p_id,
            kode: p_kode,
            nama_pelka: p_nama,
            deskripsi: p_desk,
            is_active: p_active,
            jumlah_anggota_aktual: aktual_count,
            jumlah_rekomendasi: rekomendasi_count,
        });
    }

    Ok(items)
}

#[tauri::command]
pub fn get_pelka_review_queue(
    state: State<DbState>,
    token: String,
) -> Result<Vec<PelkaReviewItem>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let _ = verify_session(&conn, &token)?;

    // Fetch pelka map (kode -> id)
    let mut pelka_stmt = conn
        .prepare("SELECT id, kode FROM pelka")
        .map_err(|e| e.to_string())?;
    let pelka_map: std::collections::HashMap<String, String> = pelka_stmt
        .query_map([], |r| Ok((r.get::<_, String>(1)?, r.get::<_, String>(0)?)))
        .map_err(|e| e.to_string())?
        .filter_map(|res| res.ok())
        .collect();

    // Query jemaat with their current pelka
    let mut stmt = conn
        .prepare(
            "SELECT j.id, j.nomor_anggota, j.nama_lengkap, j.jenis_kelamin, j.tanggal_lahir,
                    j.status_perkawinan, j.pelka_id, p.nama_pelka, p.kode, k.nama_kelompok
             FROM jemaat j
             LEFT JOIN pelka p ON j.pelka_id = p.id
             LEFT JOIN kelompok k ON j.kelompok_id = k.id
             WHERE j.is_archived = 0 AND j.status_keanggotaan = 'AKTIF'
             ORDER BY j.nama_lengkap ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |r| {
            let tgl: String = r.get(4)?;
            let jk: String = r.get(3)?;
            let sp: String = r.get(5)?;
            let pelka_id: Option<String> = r.get(6)?;
            let pelka_nama: Option<String> = r.get(7)?;
            let pelka_kode: Option<String> = r.get(8)?;

            let rec = calculate_pelka_recommendation(&tgl, &jk, &sp, None);

            Ok((
                r.get::<_, String>(0)?, // id
                r.get::<_, String>(1)?, // nomor_anggota
                r.get::<_, String>(2)?, // nama_lengkap
                jk,
                tgl,
                sp,
                pelka_id,
                pelka_nama,
                pelka_kode,
                r.get::<_, Option<String>>(9)?, // nama_kelompok
                rec,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut queue = Vec::new();

    for row in rows {
        if let Ok((id, no, nama, jk, tgl, sp, cur_id, cur_nama, cur_kode, kel_nama, rec)) = row {
            // Mismatch condition: recommendation is applicable and differs from current pelka code
            if rec.kode != "TIDAK_DAPAT_DITENTUKAN" && rec.kode != "BELUM_DITENTUKAN" {
                let is_mismatch = match &cur_kode {
                    Some(ck) => ck != &rec.kode,
                    None => true,
                };

                if is_mismatch {
                    let target_pelka_id = pelka_map.get(&rec.kode).cloned();
                    queue.push(PelkaReviewItem {
                        jemaat_id: id,
                        nomor_anggota: no,
                        nama_lengkap: nama,
                        jenis_kelamin: jk,
                        tanggal_lahir: tgl,
                        usia: rec.usia.unwrap_or(0),
                        status_perkawinan: sp,
                        pelka_aktual_id: cur_id,
                        pelka_aktual_nama: cur_nama,
                        pelka_aktual_kode: cur_kode,
                        rekomendasi_kode: rec.kode,
                        rekomendasi_nama: rec.nama_pelka,
                        rekomendasi_id: target_pelka_id,
                        alasan_rekomendasi: rec.alasan,
                        nama_kelompok: kel_nama,
                    });
                }
            }
        }
    }

    Ok(queue)
}

#[tauri::command]
pub fn apply_pelka_mutation(
    state: State<DbState>,
    token: String,
    input: PelkaMutationInput,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    // Backend authorization guard: ADMIN ONLY!
    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak menyetujui mutasi Pelka".to_string());
    }

    if input.reason.trim().is_empty() {
        return Err("Alasan mutasi Pelka wajib diisi untuk catatan riwayat audit".to_string());
    }

    // Ambil data jemaat & info pelka lama
    let (nama_lengkap, old_pelka_id, old_pelka_nama): (String, Option<String>, Option<String>) = conn
        .query_row(
            "SELECT j.nama_lengkap, j.pelka_id, p.nama_pelka
             FROM jemaat j
             LEFT JOIN pelka p ON j.pelka_id = p.id
             WHERE j.id = ?1",
            [&input.jemaat_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(|_| "Data jemaat tidak ditemukan".to_string())?;

    // Ambil nama pelka baru
    let new_pelka_nama: String = conn
        .query_row(
            "SELECT nama_pelka FROM pelka WHERE id = ?1",
            [&input.new_pelka_id],
            |r| r.get(0),
        )
        .map_err(|_| "Pelka tujuan tidak valid atau tidak ditemukan".to_string())?;

    let now = Utc::now().to_rfc3339();

    // Update pelka jemaat
    conn.execute(
        "UPDATE jemaat SET pelka_id = ?1, updated_at = ?2, updated_by = ?3 WHERE id = ?4",
        rusqlite::params![input.new_pelka_id, now, current_user.id, input.jemaat_id],
    )
    .map_err(|e| format!("Gagal memutasi Pelka jemaat: {}", e))?;

    let old_nama_str = old_pelka_nama.unwrap_or_else(|| "Belum Ada".to_string());

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "UPDATE",
        "jemaat",
        Some(&input.jemaat_id),
        old_pelka_id.as_deref(),
        Some(&input.new_pelka_id),
        &format!(
            "Persetujuan Mutasi Pelka jemaat: {} dari '{}' ke '{}'",
            nama_lengkap, old_nama_str, new_pelka_nama
        ),
        Some(input.reason.trim()),
        None,
    );

    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePelkaInput {
    pub id: String,
    pub nama_pelka: String,
    pub deskripsi: Option<String>,
}

#[tauri::command]
pub fn update_pelka(
    state: State<DbState>,
    token: String,
    input: UpdatePelkaInput,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let current_user = verify_session(&conn, &token)?;

    if current_user.role != Role::ADMIN {
        return Err("Akses ditolak: Hanya Administrator yang berhak mengubah informasi Pelka".to_string());
    }

    let nama = input.nama_pelka.trim();
    if nama.is_empty() {
        return Err("Nama Pelka tidak boleh kosong".to_string());
    }

    let deskripsi_clean = input.deskripsi.as_ref().map(|d| d.trim().to_string()).filter(|d| !d.is_empty());

    conn.execute(
        "UPDATE pelka SET nama_pelka = ?1, deskripsi = ?2 WHERE id = ?3",
        rusqlite::params![nama, deskripsi_clean, input.id],
    )
    .map_err(|e| format!("Gagal memperbarui Pelka: {}", e))?;

    let _ = log_audit(
        &conn,
        Some(&current_user.id),
        &current_user.username,
        current_user.role.as_str(),
        "UPDATE",
        "pelka",
        Some(&input.id),
        None,
        Some(nama),
        &format!("Pembaruan Informasi Pelka: {}", nama),
        None,
        None,
    );

    Ok(())
}

